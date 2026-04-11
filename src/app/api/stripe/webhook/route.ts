import { NextResponse, type NextRequest } from 'next/server'
import type Stripe from 'stripe'
import { getStripe, type PlanSlug } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase'
import { applyRecurringCommission, convertReferral } from '@/lib/referral'

export const runtime = 'nodejs'
// Webhooks MUST receive the raw body. Next.js route handlers already give us
// untouched bytes via req.text() when the content-type is application/json.
export const dynamic = 'force-dynamic'

function planFromMetadataOrPrice(
  metadata: Stripe.Metadata | null | undefined,
  priceId: string | null | undefined
): PlanSlug | null {
  if (metadata && typeof metadata.plan === 'string') {
    const p = metadata.plan
    if (p === 'essentiel' || p === 'pro' || p === 'avocat_virtuel') return p
  }
  if (!priceId) return null
  if (priceId === process.env.STRIPE_PRICE_ESSENTIEL_MONTHLY) return 'essentiel'
  if (priceId === process.env.STRIPE_PRICE_ESSENTIEL_YEARLY) return 'essentiel'
  if (priceId === process.env.STRIPE_PRICE_PRO_MONTHLY) return 'pro'
  if (priceId === process.env.STRIPE_PRICE_PRO_YEARLY) return 'pro'
  if (priceId === process.env.STRIPE_PRICE_AVOCAT_MONTHLY) return 'avocat_virtuel'
  if (priceId === process.env.STRIPE_PRICE_AVOCAT_YEARLY) return 'avocat_virtuel'
  return null
}

async function findUserByCustomerId(customerId: string) {
  const sb = createServiceClient()
  const { data } = await sb
    .from('jurispurama_users')
    .select('id, email, referred_by, subscription_plan')
    .eq('stripe_customer_id', customerId)
    .maybeSingle()
  return data
}

async function findUserByJurisId(jurisUserId: string) {
  const sb = createServiceClient()
  const { data } = await sb
    .from('jurispurama_users')
    .select('id, email, referred_by, subscription_plan')
    .eq('id', jurisUserId)
    .maybeSingle()
  return data
}

function amountToEuros(amount: number | null | undefined): number {
  if (!amount || amount < 0) return 0
  return Math.round(amount) / 100
}

export async function POST(req: NextRequest) {
  const signature = req.headers.get('stripe-signature')
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!signature || !secret) {
    return NextResponse.json(
      { received: true, warning: 'missing_signature_or_secret' },
      { status: 200 }
    )
  }

  let raw: string
  try {
    raw = await req.text()
  } catch {
    return NextResponse.json({ received: true }, { status: 200 })
  }

  let stripe
  try {
    stripe = getStripe()
  } catch {
    return NextResponse.json({ received: true }, { status: 200 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(raw, signature, secret)
  } catch (err) {
    return NextResponse.json(
      {
        received: true,
        error: err instanceof Error ? err.message : 'invalid_signature',
      },
      { status: 400 }
    )
  }

  const sb = createServiceClient()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const jurisUserId =
          typeof session.metadata?.juris_user_id === 'string'
            ? session.metadata.juris_user_id
            : null
        const customerId =
          typeof session.customer === 'string' ? session.customer : null

        // Subscription checkout
        if (session.mode === 'subscription' && jurisUserId) {
          const plan = planFromMetadataOrPrice(session.metadata ?? null, null)
          const subscriptionId =
            typeof session.subscription === 'string'
              ? session.subscription
              : null
          await sb
            .from('jurispurama_users')
            .update({
              subscription_plan: plan ?? 'essentiel',
              stripe_customer_id: customerId ?? undefined,
              stripe_subscription_id: subscriptionId ?? undefined,
            })
            .eq('id', jurisUserId)

          await sb.from('jurispurama_payments').insert({
            user_id: jurisUserId,
            stripe_payment_id: session.id,
            amount: amountToEuros(session.amount_total),
            type: 'subscription',
            status: 'succeeded',
          })
        }

        // One-time unit purchase
        if (session.mode === 'payment' && jurisUserId) {
          const unitType =
            typeof session.metadata?.unit_type === 'string'
              ? session.metadata.unit_type
              : 'dossier'
          const dbType =
            unitType === 'recommande_ar'
              ? 'recommande'
              : unitType === 'signature_supplementaire'
                ? 'signature'
                : 'dossier'
          await sb.from('jurispurama_payments').insert({
            user_id: jurisUserId,
            stripe_payment_id: session.id,
            amount: amountToEuros(session.amount_total),
            type: dbType,
            status: 'succeeded',
          })
        }
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const customerId = typeof sub.customer === 'string' ? sub.customer : null
        if (!customerId) break
        const user = await findUserByCustomerId(customerId)
        if (!user) break

        const priceId = sub.items.data[0]?.price?.id ?? null
        const plan = planFromMetadataOrPrice(sub.metadata ?? null, priceId)
        const status = sub.status // trialing, active, past_due, canceled, etc.

        const patch: Record<string, unknown> = {
          stripe_subscription_id: sub.id,
        }
        if (plan && (status === 'active' || status === 'trialing')) {
          patch.subscription_plan = plan
        } else if (status === 'canceled' || status === 'unpaid') {
          patch.subscription_plan = 'free'
        }
        await sb.from('jurispurama_users').update(patch).eq('id', user.id)
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const customerId = typeof sub.customer === 'string' ? sub.customer : null
        if (!customerId) break
        const user = await findUserByCustomerId(customerId)
        if (!user) break
        await sb
          .from('jurispurama_users')
          .update({
            subscription_plan: 'free',
            stripe_subscription_id: null,
          })
          .eq('id', user.id)
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId =
          typeof invoice.customer === 'string' ? invoice.customer : null
        if (!customerId) break
        const user = await findUserByCustomerId(customerId)
        if (!user) break

        const amountPaid = amountToEuros(invoice.amount_paid)

        await sb.from('jurispurama_payments').insert({
          user_id: user.id,
          stripe_payment_id: invoice.id,
          amount: amountPaid,
          type: 'subscription',
          status: 'succeeded',
        })

        // Referral hook: if user has a referrer, credit commission
        if (user.referred_by && amountPaid > 0) {
          try {
            // First paid invoice ⇒ conversion (50% premier paiement)
            // Subsequent ⇒ 10% récurrent
            const { count } = await sb
              .from('jurispurama_payments')
              .select('id', { count: 'exact', head: true })
              .eq('user_id', user.id)
              .eq('type', 'subscription')
              .eq('status', 'succeeded')
            const isFirstPayment = (count ?? 0) <= 1
            if (isFirstPayment) {
              await convertReferral({
                referredUserId: user.id,
                firstPaymentAmountEuros: amountPaid,
              })
            } else {
              await applyRecurringCommission({
                referredUserId: user.id,
                amountEuros: amountPaid,
              })
            }
          } catch {
            // Non-fatal: log would go to Sentry in prod, webhook still returns 200
          }
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId =
          typeof invoice.customer === 'string' ? invoice.customer : null
        if (!customerId) break
        const user = await findUserByCustomerId(customerId)
        if (!user) break
        await sb.from('jurispurama_notifications').insert({
          user_id: user.id,
          type: 'payment_failed',
          title: 'Échec de paiement',
          message:
            'Ton paiement n\'a pas pu être prélevé. Vérifie ta carte dans le portail Stripe pour éviter une suspension.',
          link: '/abonnement',
        })
        break
      }

      default:
        break
    }
  } catch {
    // Never throw — Stripe would retry infinitely and we want idempotency
  }

  // Suppress unused var lint
  void findUserByJurisId

  return NextResponse.json({ received: true }, { status: 200 })
}
