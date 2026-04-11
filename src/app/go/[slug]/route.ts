import { NextResponse, type NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export const runtime = 'nodejs'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const clean = slug.replace(/[^a-zA-Z0-9\-]/g, '').slice(0, 60).toLowerCase()

  const sb = createServiceClient()
  const { data: influencer } = await sb
    .from('jurispurama_influencers')
    .select('id, slug, user_id, total_clicks')
    .eq('slug', clean)
    .maybeSingle()

  const target = new URL('/signup', req.nextUrl.origin)
  if (influencer) {
    // Resolve referrer's referral_code to use the standard ?ref= flow
    const { data: owner } = await sb
      .from('jurispurama_users')
      .select('referral_code')
      .eq('id', influencer.user_id)
      .maybeSingle()
    if (owner?.referral_code) {
      target.searchParams.set('ref', owner.referral_code)
    }
    target.searchParams.set('utm_source', 'influencer')
    target.searchParams.set('utm_medium', 'go_link')
    target.searchParams.set('utm_campaign', influencer.slug)

    // Best-effort increment of clicks
    const current = Number(influencer.total_clicks ?? 0)
    await sb
      .from('jurispurama_influencers')
      .update({ total_clicks: current + 1 })
      .eq('id', influencer.id)
  } else {
    target.searchParams.set('utm_source', 'influencer')
    target.searchParams.set('utm_campaign', clean || 'unknown')
  }

  const res = NextResponse.redirect(target, { status: 302 })
  // 30-day tracking cookie
  res.cookies.set('juris_ref_slug', clean, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  })
  return res
}
