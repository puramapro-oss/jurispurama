/**
 * Stripe wrapper — lazy init (avoids instantiating at build time)
 * + plan catalogue + one-time payment catalogue.
 *
 * Price IDs are loaded from env vars (populated once via
 * `src/scripts/setup-stripe-prices.ts`). If absent, the server throws a
 * clear French error when /api/stripe/checkout is called, never at build.
 */
import Stripe from 'stripe'

let stripeSingleton: Stripe | null = null

export function getStripe(): Stripe {
  if (stripeSingleton) return stripeSingleton
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error(
      'STRIPE_SECRET_KEY manquant côté serveur — configure la variable d\'environnement Stripe.'
    )
  }
  stripeSingleton = new Stripe(key, {
    apiVersion: '2026-03-25.dahlia',
    typescript: true,
  })
  return stripeSingleton
}

export type PlanSlug = 'essentiel' | 'pro' | 'avocat_virtuel'
export type BillingCycle = 'monthly' | 'yearly'

export interface StripePlanDefinition {
  slug: PlanSlug
  name: string
  monthly: { amount: number; envKey: string }
  yearly: { amount: number; envKey: string }
}

/**
 * Catalogue plans JurisPurama. Amounts in cents.
 */
export const JURIS_PLANS: Record<PlanSlug, StripePlanDefinition> = {
  essentiel: {
    slug: 'essentiel',
    name: 'Essentiel',
    monthly: { amount: 999, envKey: 'STRIPE_PRICE_ESSENTIEL_MONTHLY' },
    yearly: { amount: 8390, envKey: 'STRIPE_PRICE_ESSENTIEL_YEARLY' },
  },
  pro: {
    slug: 'pro',
    name: 'Pro',
    monthly: { amount: 1999, envKey: 'STRIPE_PRICE_PRO_MONTHLY' },
    yearly: { amount: 16790, envKey: 'STRIPE_PRICE_PRO_YEARLY' },
  },
  avocat_virtuel: {
    slug: 'avocat_virtuel',
    name: 'Avocat Virtuel',
    monthly: { amount: 3999, envKey: 'STRIPE_PRICE_AVOCAT_MONTHLY' },
    yearly: { amount: 33590, envKey: 'STRIPE_PRICE_AVOCAT_YEARLY' },
  },
}

export type UnitSlug =
  | 'recommande_ar'
  | 'signature_supplementaire'
  | 'generation_doc_supplementaire'

export interface UnitDefinition {
  slug: UnitSlug
  name: string
  amount: number
  envKey: string
  description: string
}

export const JURIS_UNITS: Record<UnitSlug, UnitDefinition> = {
  recommande_ar: {
    slug: 'recommande_ar',
    name: 'Recommandé AR électronique',
    amount: 599,
    envKey: 'STRIPE_PRICE_UNIT_RECOMMANDE',
    description:
      'Envoi d\'un recommandé avec AR horodaté (valeur légale Art. 1369-7 CC).',
  },
  signature_supplementaire: {
    slug: 'signature_supplementaire',
    name: 'Signature électronique supplémentaire',
    amount: 199,
    envKey: 'STRIPE_PRICE_UNIT_SIGNATURE',
    description: 'Signature additionnelle hors forfait inclus.',
  },
  generation_doc_supplementaire: {
    slug: 'generation_doc_supplementaire',
    name: 'Document juridique supplémentaire',
    amount: 299,
    envKey: 'STRIPE_PRICE_UNIT_DOCUMENT',
    description: 'Génération d\'un document juridique hors forfait.',
  },
}

export function resolvePriceId(
  plan: PlanSlug,
  billing: BillingCycle
): string {
  const def = JURIS_PLANS[plan][billing]
  const id = process.env[def.envKey]
  if (!id) {
    throw new Error(
      `Tarif Stripe non configuré (${def.envKey}). Lance le script setup-stripe-prices avant le premier checkout.`
    )
  }
  return id
}

export function resolveUnitPriceId(unit: UnitSlug): string {
  const def = JURIS_UNITS[unit]
  const id = process.env[def.envKey]
  if (!id) {
    throw new Error(
      `Tarif unitaire Stripe non configuré (${def.envKey}). Lance le script setup-stripe-prices avant le premier checkout.`
    )
  }
  return id
}

/**
 * WELCOME10 = -10% premier mois pour les nouveaux abonnés.
 * Créé dynamiquement la première fois puis réutilisé.
 */
export async function getOrCreateWelcomeCoupon(): Promise<string> {
  const stripe = getStripe()
  const envCoupon = process.env.STRIPE_COUPON_WELCOME10
  if (envCoupon) return envCoupon
  const coupon = await stripe.coupons.create({
    id: 'welcome10_jurispurama',
    percent_off: 10,
    duration: 'once',
    name: 'Bienvenue chez JurisPurama (-10%)',
  })
  return coupon.id
}

/**
 * Convert amount (cents) to human-readable euros.
 */
export function formatAmount(cents: number): string {
  return (cents / 100).toLocaleString('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  })
}

export function planLabel(slug: PlanSlug | 'free'): string {
  if (slug === 'free') return 'Gratuit'
  return JURIS_PLANS[slug].name
}
