import type Stripe from 'stripe'
import { createServiceClient } from '@/lib/supabase'
import { applyRecurringCommission, convertReferral } from '@/lib/referral'
import { planFromMetadataOrPrice, findUserByCustomerId, amountToEuros } from './helpers'

export async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session
): Promise<void> {
  const sb = createServiceClient()
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
}

export async function handleSubscriptionCreatedOrUpdated(
  sub: Stripe.Subscription,
  eventType: 'customer.subscription.created' | 'customer.subscription.updated'
): Promise<void> {
  const sb = createServiceClient()
  const customerId = typeof sub.customer === 'string' ? sub.customer : null
  if (!customerId) return
  const user = await findUserByCustomerId(customerId)
  if (!user) return

  const priceId = sub.items.data[0]?.price?.id ?? null
  const plan = planFromMetadataOrPrice(sub.metadata ?? null, priceId)
  const status = sub.status

  const patch: Record<string, unknown> = {
    stripe_subscription_id: sub.id,
  }
  if (plan && (status === 'active' || status === 'trialing')) {
    patch.subscription_plan = plan
    if (eventType === 'customer.subscription.created') {
      patch.subscription_started_at = new Date(sub.start_date * 1000).toISOString()
    }
  } else if (status === 'canceled' || status === 'unpaid') {
    patch.subscription_plan = 'free'
  }
  await sb.from('jurispurama_users').update(patch).eq('id', user.id)

  // Prime J1
  if (eventType === 'customer.subscription.created') {
    try {
      const { count: primeCount } = await sb
        .from('jurispurama_wallet_transactions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('source', 'prime_j1')
      if ((primeCount ?? 0) === 0) {
        await sb.from('jurispurama_wallet_transactions').insert({
          user_id: user.id,
          amount: 25,
          type: 'credit',
          source: 'prime_j1',
          description: 'Prime de bienvenue J1 (art. L221-28)',
        })
        await sb.from('jurispurama_notifications').insert({
          user_id: user.id,
          type: 'prime_credited',
          title: '💰 Prime J1 créditée',
          message:
            '25€ de prime de bienvenue ajoutés à ton wallet. Prochaine tranche dans 30 jours.',
          link: '/wallet',
        })
      }
    } catch {
      // non-bloquant
    }
  }
}

export async function handleSubscriptionDeleted(
  sub: Stripe.Subscription
): Promise<void> {
  const sb = createServiceClient()
  const customerId = typeof sub.customer === 'string' ? sub.customer : null
  if (!customerId) return
  const user = await findUserByCustomerId(customerId)
  if (!user) return
  await sb
    .from('jurispurama_users')
    .update({
      subscription_plan: 'free',
      stripe_subscription_id: null,
    })
    .eq('id', user.id)
}

export async function handleInvoicePaymentSucceeded(
  invoice: Stripe.Invoice
): Promise<void> {
  const sb = createServiceClient()
  const customerId =
    typeof invoice.customer === 'string' ? invoice.customer : null
  if (!customerId) return
  const user = await findUserByCustomerId(customerId)
  if (!user) return

  const amountPaid = amountToEuros(invoice.amount_paid)

  await sb.from('jurispurama_payments').insert({
    user_id: user.id,
    stripe_payment_id: invoice.id,
    amount: amountPaid,
    type: 'subscription',
    status: 'succeeded',
  })

  // Referral hook
  if (user.referred_by && amountPaid > 0) {
    try {
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
      // Non-fatal
    }
  }
}

export async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice
): Promise<void> {
  const sb = createServiceClient()
  const customerId =
    typeof invoice.customer === 'string' ? invoice.customer : null
  if (!customerId) return
  const user = await findUserByCustomerId(customerId)
  if (!user) return
  await sb.from('jurispurama_notifications').insert({
    user_id: user.id,
    type: 'payment_failed',
    title: 'Échec de paiement',
    message:
      'Ton paiement n\'a pas pu être prélevé. Vérifie ta carte dans le portail Stripe pour éviter une suspension.',
    link: '/settings/abonnement',
  })
}

export async function handleChargeRefunded(charge: Stripe.Charge): Promise<void> {
  const sb = createServiceClient()
  const customerId =
    typeof charge.customer === 'string' ? charge.customer : null
  if (!customerId) return
  const user = await findUserByCustomerId(customerId)
  if (!user) return

  const { data: userRow } = await sb
    .from('jurispurama_users')
    .select('subscription_started_at')
    .eq('id', user.id)
    .single()

  const startedAt = userRow?.subscription_started_at
    ? new Date(userRow.subscription_started_at)
    : null
  const daysActive = startedAt
    ? Math.floor((Date.now() - startedAt.getTime()) / (1000 * 60 * 60 * 24))
    : 999

  const amountRefunded = amountToEuros(charge.amount_refunded)
  let primeDeducted = 0
  if (daysActive < 30) {
    const { data: primeTx } = await sb
      .from('jurispurama_wallet_transactions')
      .select('amount')
      .eq('user_id', user.id)
      .eq('source', 'prime_j1')
      .eq('type', 'credit')
    primeDeducted = (primeTx ?? []).reduce(
      (acc, r) => acc + Number(r.amount ?? 0),
      0
    )
    if (primeDeducted > 0) {
      await sb.from('jurispurama_wallet_transactions').insert({
        user_id: user.id,
        amount: -primeDeducted,
        type: 'debit',
        source: 'prime_deduction_retractation',
        description: 'Déduction prime — annulation < 30 jours (CGV art. prime)',
      })
    }
  }

  await sb.from('jurispurama_retractations').insert({
    user_id: user.id,
    amount_refunded: amountRefunded,
    prime_deducted: primeDeducted,
    processed_at: new Date().toISOString(),
    processed_by: 'auto',
    stripe_refund_id: charge.id,
    reason: 'Refund Stripe triggered',
  })

  await sb.from('jurispurama_notifications').insert({
    user_id: user.id,
    type: 'refund_processed',
    title: 'Remboursement traité',
    message: `${amountRefunded.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })} remboursés. ${
      primeDeducted > 0
        ? `Prime déduite : ${primeDeducted.toFixed(2)}€ (CGV art. prime L221-28).`
        : ''
    }`,
    link: '/settings/abonnement',
  })
}
