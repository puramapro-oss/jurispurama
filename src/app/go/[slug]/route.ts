import { NextResponse, type NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import {
  PURAMA_APP_SLUGS,
  PROMO_COOKIE_NAME,
  PROMO_COOKIE_MAX_AGE,
} from '@/lib/cross-promo'

export const runtime = 'nodejs'

/**
 * Double usage :
 * 1. /go/[influencer-slug] → track influencer (ambassador) + redirect /signup?ref=CODE
 * 2. /go/[purama-app-slug]?coupon=WELCOME50 → cross-promo : pose cookie purama_promo + redirect /signup
 *
 * Les deux sont gérés par la même route car la sémantique utilisateur est similaire :
 * "un lien externe m'a mené ici, j'arrive en tant que prospect".
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const clean = slug.replace(/[^a-zA-Z0-9\-_]/g, '').slice(0, 60).toLowerCase()

  const coupon = req.nextUrl.searchParams.get('coupon')?.toUpperCase().slice(0, 30) ?? null
  const isPuramaApp = PURAMA_APP_SLUGS.has(clean)

  const sb = createServiceClient()
  const target = new URL('/signup', req.nextUrl.origin)

  // Cas 1 — cross-promo inter-app Purama : /go/midas?coupon=WELCOME50
  if (isPuramaApp && coupon) {
    target.searchParams.set('utm_source', 'cross_promo')
    target.searchParams.set('utm_medium', 'purama_app')
    target.searchParams.set('utm_campaign', clean)
    target.searchParams.set('coupon', coupon)

    const res = NextResponse.redirect(target, { status: 302 })
    // Cookie purama_promo lisible par /api/stripe/checkout
    const expires = new Date(Date.now() + PROMO_COOKIE_MAX_AGE * 1000).toISOString()
    res.cookies.set(
      PROMO_COOKIE_NAME,
      JSON.stringify({ coupon, source: clean, expires }),
      {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: PROMO_COOKIE_MAX_AGE,
        path: '/',
      }
    )
    return res
  }

  // Cas 2 — Ambassador link tracking (ex-"influencer")
  const { data: influencer } = await sb
    .from('jurispurama_influencers')
    .select('id, slug, user_id, total_clicks')
    .eq('slug', clean)
    .maybeSingle()

  if (influencer) {
    const { data: owner } = await sb
      .from('jurispurama_users')
      .select('referral_code')
      .eq('id', influencer.user_id)
      .maybeSingle()
    if (owner?.referral_code) {
      target.searchParams.set('ref', owner.referral_code)
    }
    target.searchParams.set('utm_source', 'ambassador')
    target.searchParams.set('utm_medium', 'go_link')
    target.searchParams.set('utm_campaign', influencer.slug)

    // Best-effort increment of clicks
    const current = Number(influencer.total_clicks ?? 0)
    await sb
      .from('jurispurama_influencers')
      .update({ total_clicks: current + 1 })
      .eq('id', influencer.id)
  } else {
    target.searchParams.set('utm_source', 'ambassador')
    target.searchParams.set('utm_campaign', clean || 'unknown')
  }

  const res = NextResponse.redirect(target, { status: 302 })
  res.cookies.set('juris_ref_slug', clean, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  })
  return res
}
