import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import {
  getStripe,
  resolveUnitPriceId,
  type UnitSlug,
} from '@/lib/stripe'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { APP_DOMAIN } from '@/lib/constants'

export const runtime = 'nodejs'

const BodySchema = z.object({
  type: z.enum([
    'recommande_ar',
    'signature_supplementaire',
    'generation_doc_supplementaire',
  ]),
  metadata: z
    .object({
      doc_id: z.string().uuid().optional(),
      case_id: z.string().uuid().optional(),
    })
    .default({}),
})

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corps JSON invalide.' }, { status: 400 })
  }
  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Type ou métadonnées invalides.', details: parsed.error.issues },
      { status: 400 }
    )
  }
  const { type, metadata } = parsed.data as {
    type: UnitSlug
    metadata: { doc_id?: string; case_id?: string }
  }

  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json(
      { error: 'Connecte-toi pour finaliser ce paiement.' },
      { status: 401 }
    )
  }

  const { data: profile } = await supabase
    .from('jurispurama_users')
    .select('id, email, full_name, stripe_customer_id')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!profile) {
    return NextResponse.json(
      { error: 'Profil introuvable.' },
      { status: 500 }
    )
  }

  let stripe
  let priceId: string
  try {
    stripe = getStripe()
    priceId = resolveUnitPriceId(type)
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

  const origin = req.nextUrl.origin || `https://${APP_DOMAIN}`
  const successBase = metadata.doc_id
    ? `${origin}/documents/${metadata.doc_id}?paid=1`
    : `${origin}/dashboard?paid=1`

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: {
      juris_user_id: profile.id,
      unit_type: type,
      doc_id: metadata.doc_id ?? '',
      case_id: metadata.case_id ?? '',
    },
    payment_intent_data: {
      metadata: {
        juris_user_id: profile.id,
        unit_type: type,
        doc_id: metadata.doc_id ?? '',
        case_id: metadata.case_id ?? '',
      },
    },
    success_url: `${successBase}&checkout_session={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/documents/${metadata.doc_id ?? ''}?canceled=1`,
    payment_method_types: ['card', 'link'],
    locale: 'fr',
  })

  if (!session.url) {
    return NextResponse.json(
      { error: 'Impossible de créer la session Stripe.' },
      { status: 502 }
    )
  }

  return NextResponse.json({ url: session.url })
}
