import { NextResponse, type NextRequest } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { APP_DOMAIN } from '@/lib/constants'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json(
      { error: 'Connecte-toi pour gérer ton abonnement.' },
      { status: 401 }
    )
  }

  const { data: profile } = await supabase
    .from('jurispurama_users')
    .select('stripe_customer_id')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!profile?.stripe_customer_id) {
    return NextResponse.json(
      {
        error:
          'Aucun abonnement Stripe actif. Souscris un plan avant d\'accéder au portail.',
      },
      { status: 400 }
    )
  }

  let stripe
  try {
    stripe = getStripe()
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

  const origin = req.nextUrl.origin || `https://${APP_DOMAIN}`

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${origin}/abonnement`,
    })
    return NextResponse.json({ url: session.url })
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : 'Erreur Stripe portail. Réessaie dans un instant.'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
