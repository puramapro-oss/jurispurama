import { NextResponse, type NextRequest } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'
import { APP_DOMAIN } from '@/lib/constants'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET ?action=status → renvoie info subscription (plan, status, period_end, started_at, amount)
 * POST {action: 'portal' (default)} → crée billing portal session
 * POST {action: 'pause'} → pause 1 mois (resumes_at = now + 30d)
 * POST {action: 'cancel', reason, reason_detail} → cancel_at_period_end=true + log raison
 */

export async function GET(req: NextRequest) {
  const action = req.nextUrl.searchParams.get('action')
  if (action !== 'status') {
    return NextResponse.json({ error: 'Action inconnue.' }, { status: 400 })
  }

  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Auth requise' }, { status: 401 })

  const { data: profile } = await supabase
    .from('jurispurama_users')
    .select(
      'id, stripe_customer_id, stripe_subscription_id, subscription_plan, subscription_started_at'
    )
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!profile?.stripe_subscription_id) {
    return NextResponse.json({
      plan: profile?.subscription_plan ?? 'free',
      status: 'inactive',
      current_period_end: null,
      subscription_started_at: profile?.subscription_started_at ?? null,
      cancel_at_period_end: false,
      amount_cents: 0,
      billing_interval: null,
    })
  }

  try {
    const stripe = getStripe()
    const sub = await stripe.subscriptions.retrieve(profile.stripe_subscription_id, {
      expand: ['items.data.price.product'],
    })
    const item = sub.items.data[0]
    const price = item?.price
    // Stripe type-narrow: period_end is on the subscription's first item.current_period_end,
    // but historically it was on the sub itself. We try both.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const periodEndTs =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (item as any)?.current_period_end ?? (sub as any).current_period_end ?? null

    return NextResponse.json({
      plan: profile.subscription_plan,
      status: sub.status,
      current_period_end: periodEndTs ? new Date(periodEndTs * 1000).toISOString() : null,
      subscription_started_at: profile.subscription_started_at,
      cancel_at_period_end: sub.cancel_at_period_end,
      amount_cents: price?.unit_amount ?? 0,
      billing_interval: price?.recurring?.interval ?? null,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Stripe error' },
      { status: 502 }
    )
  }
}

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
    .select('id, stripe_customer_id, stripe_subscription_id')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!profile?.stripe_customer_id) {
    return NextResponse.json(
      { error: 'Aucun abonnement Stripe actif.' },
      { status: 400 }
    )
  }

  let body: { action?: string; reason?: string; reason_detail?: string } = {}
  try {
    body = await req.json()
  } catch {
    body = {}
  }
  const action = body.action ?? 'portal'

  let stripe
  try {
    stripe = getStripe()
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Config Stripe KO' },
      { status: 500 }
    )
  }

  const origin = req.nextUrl.origin || `https://${APP_DOMAIN}`

  // PAUSE 30 jours
  if (action === 'pause') {
    if (!profile.stripe_subscription_id) {
      return NextResponse.json(
        { error: 'Aucun abonnement à mettre en pause.' },
        { status: 400 }
      )
    }
    try {
      const resumesAt = Math.floor((Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000)
      await stripe.subscriptions.update(profile.stripe_subscription_id, {
        pause_collection: { behavior: 'void', resumes_at: resumesAt },
      })
      return NextResponse.json({
        ok: true,
        message: 'Abonnement en pause pendant 30 jours.',
        url: `${origin}/settings/abonnement?paused=1`,
      })
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'Pause échouée' },
        { status: 502 }
      )
    }
  }

  // CANCEL end of period
  if (action === 'cancel') {
    if (!profile.stripe_subscription_id) {
      return NextResponse.json(
        { error: 'Aucun abonnement à résilier.' },
        { status: 400 }
      )
    }
    try {
      await stripe.subscriptions.update(profile.stripe_subscription_id, {
        cancel_at_period_end: true,
        metadata: {
          cancel_reason: body.reason ?? 'unknown',
          cancel_reason_detail: (body.reason_detail ?? '').slice(0, 500),
        },
      })
      // Log feedback
      const admin = createServiceClient()
      await admin.from('jurispurama_contact_messages').insert({
        user_id: profile.id,
        app_slug: 'jurispurama',
        name: 'Résiliation',
        email: user.email ?? null,
        subject: `Résiliation — raison : ${body.reason ?? 'unknown'}`,
        message: body.reason_detail ?? '',
      })
      return NextResponse.json({
        ok: true,
        message:
          'Abonnement résilié. Tu gardes l\'accès jusqu\'à la fin de ta période en cours.',
      })
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'Résiliation échouée' },
        { status: 502 }
      )
    }
  }

  // DEFAULT → Billing Portal Stripe
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${origin}/settings/abonnement`,
    })
    return NextResponse.json({ url: session.url })
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : 'Portail Stripe indisponible. Réessaie.',
      },
      { status: 502 }
    )
  }
}
