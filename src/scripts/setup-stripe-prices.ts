/**
 * Run once to provision JurisPurama Products + Prices in Stripe (live mode).
 *
 * Usage:
 *   STRIPE_SECRET_KEY=sk_live_... npx tsx src/scripts/setup-stripe-prices.ts
 *
 * Prints the env vars to copy into Vercel env (STRIPE_PRICE_*).
 * Idempotent: uses stable lookup_key to avoid duplicates.
 */
/* eslint-disable no-console */
import Stripe from 'stripe'

interface PriceSeed {
  lookupKey: string
  productName: string
  productDesc: string
  amount: number
  interval?: 'month' | 'year'
  envVarName: string
}

const SEEDS: PriceSeed[] = [
  {
    lookupKey: 'jurispurama_essentiel_monthly',
    productName: 'JurisPurama — Essentiel',
    productDesc:
      'Consultations illimitées, 5 documents / mois, signature électronique, suivi de dossier.',
    amount: 999,
    interval: 'month',
    envVarName: 'STRIPE_PRICE_ESSENTIEL_MONTHLY',
  },
  {
    lookupKey: 'jurispurama_essentiel_yearly',
    productName: 'JurisPurama — Essentiel',
    productDesc:
      'Consultations illimitées, 5 documents / mois, signature électronique, suivi de dossier.',
    amount: 8390,
    interval: 'year',
    envVarName: 'STRIPE_PRICE_ESSENTIEL_YEARLY',
  },
  {
    lookupKey: 'jurispurama_pro_monthly',
    productName: 'JurisPurama — Pro',
    productDesc:
      'Tout illimité, 3 recommandés AR / mois inclus, 50 envois email / mois.',
    amount: 1999,
    interval: 'month',
    envVarName: 'STRIPE_PRICE_PRO_MONTHLY',
  },
  {
    lookupKey: 'jurispurama_pro_yearly',
    productName: 'JurisPurama — Pro',
    productDesc:
      'Tout illimité, 3 recommandés AR / mois inclus, 50 envois email / mois.',
    amount: 16790,
    interval: 'year',
    envVarName: 'STRIPE_PRICE_PRO_YEARLY',
  },
  {
    lookupKey: 'jurispurama_avocat_virtuel_monthly',
    productName: 'JurisPurama — Avocat Virtuel',
    productDesc:
      'Tout illimité, recommandés illimités, alertes avancées, suivi prioritaire.',
    amount: 3999,
    interval: 'month',
    envVarName: 'STRIPE_PRICE_AVOCAT_MONTHLY',
  },
  {
    lookupKey: 'jurispurama_avocat_virtuel_yearly',
    productName: 'JurisPurama — Avocat Virtuel',
    productDesc:
      'Tout illimité, recommandés illimités, alertes avancées, suivi prioritaire.',
    amount: 33590,
    interval: 'year',
    envVarName: 'STRIPE_PRICE_AVOCAT_YEARLY',
  },
  // One-time units
  {
    lookupKey: 'jurispurama_unit_recommande',
    productName: 'JurisPurama — Recommandé AR',
    productDesc: 'Envoi recommandé électronique avec accusé réception horodaté.',
    amount: 599,
    envVarName: 'STRIPE_PRICE_UNIT_RECOMMANDE',
  },
  {
    lookupKey: 'jurispurama_unit_signature',
    productName: 'JurisPurama — Signature supplémentaire',
    productDesc: 'Signature électronique additionnelle hors forfait.',
    amount: 199,
    envVarName: 'STRIPE_PRICE_UNIT_SIGNATURE',
  },
  {
    lookupKey: 'jurispurama_unit_document',
    productName: 'JurisPurama — Document supplémentaire',
    productDesc: 'Génération d\'un document juridique supplémentaire hors forfait.',
    amount: 299,
    envVarName: 'STRIPE_PRICE_UNIT_DOCUMENT',
  },
]

async function main() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY missing')
  const stripe = new Stripe(key, {
    apiVersion: '2026-03-25.dahlia',
  })

  const productsCache = new Map<string, string>()
  const output: Record<string, string> = {}

  for (const seed of SEEDS) {
    // Lookup existing price by lookup_key first (idempotent)
    const existing = await stripe.prices.list({
      lookup_keys: [seed.lookupKey],
      active: true,
      limit: 1,
    })
    if (existing.data[0]) {
      console.log(`[ok] ${seed.lookupKey} = ${existing.data[0].id}`)
      output[seed.envVarName] = existing.data[0].id
      continue
    }

    // Reuse product per productName
    let productId = productsCache.get(seed.productName)
    if (!productId) {
      const found = await stripe.products.search({
        query: `name:'${seed.productName.replace(/'/g, "\\'")}' AND active:'true'`,
        limit: 1,
      })
      if (found.data[0]) {
        productId = found.data[0].id
      } else {
        const p = await stripe.products.create({
          name: seed.productName,
          description: seed.productDesc,
        })
        productId = p.id
      }
      productsCache.set(seed.productName, productId)
    }

    const price = await stripe.prices.create({
      product: productId,
      unit_amount: seed.amount,
      currency: 'eur',
      lookup_key: seed.lookupKey,
      transfer_lookup_key: true,
      ...(seed.interval
        ? { recurring: { interval: seed.interval } }
        : {}),
      nickname: seed.lookupKey,
    })
    console.log(`[created] ${seed.lookupKey} = ${price.id}`)
    output[seed.envVarName] = price.id
  }

  // Coupon WELCOME10 for -10% first month
  try {
    await stripe.coupons.retrieve('welcome10_jurispurama')
    console.log('[ok] coupon welcome10_jurispurama')
  } catch {
    await stripe.coupons.create({
      id: 'welcome10_jurispurama',
      percent_off: 10,
      duration: 'once',
      name: 'Bienvenue chez JurisPurama (-10%)',
    })
    console.log('[created] coupon welcome10_jurispurama')
  }
  output['STRIPE_COUPON_WELCOME10'] = 'welcome10_jurispurama'

  console.log('\n=== Copy these into Vercel env ===')
  for (const [k, v] of Object.entries(output)) {
    console.log(`${k}=${v}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
