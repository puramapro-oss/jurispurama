import type Stripe from 'stripe'
import { type PlanSlug } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase'

export function planFromMetadataOrPrice(
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

export async function findUserByCustomerId(customerId: string) {
  const sb = createServiceClient()
  const { data } = await sb
    .from('jurispurama_users')
    .select('id, email, referred_by, subscription_plan')
    .eq('stripe_customer_id', customerId)
    .maybeSingle()
  return data
}

export function amountToEuros(amount: number | null | undefined): number {
  if (!amount || amount < 0) return 0
  return Math.round(amount) / 100
}
