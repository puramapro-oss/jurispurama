import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import {
  getStripe,
  resolvePriceId,
  getOrCreateWelcomeCoupon,
  type PlanSlug,
  type BillingCycle,
} from '@/lib/stripe'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { APP_DOMAIN } from '@/lib/constants'

export const runtime = 'nodejs'

const BodySchema = z.object({
  plan: z.enum(['essentiel', 'pro', 'avocat_virtuel']),
  billing: z.enum(['monthly', 'yearly']),
  couponCode: z.string().trim().max(40).optional(),
})

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: 'Corps JSON invalide. Vérifie la requête.' },
      { status: 400 }
    )
  }
  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Plan ou période invalide.', details: parsed.error.issues },
      { status: 400 }
    )
  }
  const { plan, billing, couponCode } = parsed.data as {
    plan: PlanSlug
    billing: BillingCycle
    couponCode?: string
  }

  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json(
      { error: 'Tu dois être connecté pour souscrire un abonnement.' },
      { status: 401 }
    )
  }

  const { data: profile, error: profileErr } = await supabase
    .from('jurispurama_users')
    .select('id, email, full_name, stripe_customer_id, referred_by')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (profileErr || !profile) {
    return NextResponse.json(
      { error: 'Profil introuvable. Recharge la page puis réessaie.' },
      { status: 500 }
    )
  }

  let stripe
  let priceId: string
  try {
    stripe = getStripe()
    priceId = resolvePriceId(plan, billing)
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : 'Configuration Stripe incomplète.',
      },
      { status: 500 }
    )
  }

  // Reuse or create customer
  let customerId = profile.stripe_customer_id
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: profile.email,
      name: profile.full_name ?? undefined,
      metadata: { juris_user_id: profile.id, auth_user_id: user.id },
    })
    customerId = customer.id
    await supabase
      .from('jurispurama_users')
      .update({ stripe_customer_id: customerId })
      .eq('id', profile.id)
  }

  // Discounts: WELCOME10 if requested, else allow promo codes at checkout
  const discounts: Array<{ coupon: string }> = []
  if (couponCode && couponCode.toUpperCase() === 'WELCOME10') {
    try {
      const couponId = await getOrCreateWelcomeCoupon()
      discounts.push({ coupon: couponId })
    } catch {
      // Non-fatal: user can still enter a promo code in checkout
    }
  }

  const origin = req.nextUrl.origin || `https://${APP_DOMAIN}`

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      trial_period_days: 14,
      metadata: {
        juris_user_id: profile.id,
        plan,
        billing,
        referred_by: profile.referred_by ?? '',
      },
    },
    metadata: {
      juris_user_id: profile.id,
      plan,
      billing,
      referred_by: profile.referred_by ?? '',
    },
    success_url: `${origin}/dashboard?upgrade=success&plan=${plan}`,
    cancel_url: `${origin}/abonnement?canceled=1`,
    ...(discounts.length > 0
      ? { discounts }
      : { allow_promotion_codes: true }),
    payment_method_types: ['card', 'paypal', 'link'],
    locale: 'fr',
    billing_address_collection: 'auto',
    automatic_tax: { enabled: false },
    tax_id_collection: { enabled: false },
  })

  if (!session.url) {
    return NextResponse.json(
      { error: 'Impossible de créer la session Stripe. Réessaie dans un instant.' },
      { status: 502 }
    )
  }

  return NextResponse.json({ url: session.url })
}
