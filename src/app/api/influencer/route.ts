import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'

export const runtime = 'nodejs'

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 30)
}

function randomSuffix(): string {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789'
  let out = ''
  for (let i = 0; i < 4; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return out
}

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json(
      { error: 'Connecte-toi pour accéder à ton espace influenceur.' },
      { status: 401 }
    )
  }

  const { data: profile } = await supabase
    .from('jurispurama_users')
    .select('id, email, full_name')
    .eq('auth_user_id', user.id)
    .maybeSingle()
  if (!profile) {
    return NextResponse.json(
      { error: 'Profil introuvable.' },
      { status: 404 }
    )
  }

  const { data: influencer } = await supabase
    .from('jurispurama_influencers')
    .select(
      'id, slug, bio, social_links, audience_size, approved, tier, free_plan_granted, total_clicks, total_signups, total_conversions, total_commissions, created_at'
    )
    .eq('user_id', profile.id)
    .maybeSingle()

  return NextResponse.json({ influencer })
}

const ApplySchema = z.object({
  bio: z.string().trim().min(10).max(2000),
  socialLinks: z
    .object({
      instagram: z.string().trim().max(200).optional().or(z.literal('')),
      tiktok: z.string().trim().max(200).optional().or(z.literal('')),
      youtube: z.string().trim().max(200).optional().or(z.literal('')),
      twitter: z.string().trim().max(200).optional().or(z.literal('')),
      linkedin: z.string().trim().max(200).optional().or(z.literal('')),
    })
    .default({}),
  audienceSize: z.coerce.number().int().min(0).max(100_000_000),
  reason: z.string().trim().min(10).max(2000),
})

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corps JSON invalide.' }, { status: 400 })
  }
  const parsed = ApplySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          'Formulaire invalide. Vérifie la bio, la raison et les liens sociaux.',
        details: parsed.error.issues,
      },
      { status: 400 }
    )
  }

  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json(
      { error: 'Connecte-toi pour postuler.' },
      { status: 401 }
    )
  }

  const { data: profile } = await supabase
    .from('jurispurama_users')
    .select('id, email, full_name, referral_code')
    .eq('auth_user_id', user.id)
    .maybeSingle()
  if (!profile) {
    return NextResponse.json(
      { error: 'Profil introuvable.' },
      { status: 404 }
    )
  }

  // Already influencer?
  const { data: existing } = await supabase
    .from('jurispurama_influencers')
    .select('id, slug')
    .eq('user_id', profile.id)
    .maybeSingle()
  if (existing) {
    return NextResponse.json({ influencer: existing, alreadyApproved: true })
  }

  // Generate unique slug
  const base = slugify(profile.full_name ?? profile.email.split('@')[0] ?? 'juris')
  const sb = createServiceClient()
  let slug = `${base}-${randomSuffix()}`
  for (let i = 0; i < 5; i += 1) {
    const { data: clash } = await sb
      .from('jurispurama_influencers')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()
    if (!clash) break
    slug = `${base}-${randomSuffix()}`
  }

  const payload = parsed.data
  const { data: created, error: insertErr } = await sb
    .from('jurispurama_influencers')
    .insert({
      user_id: profile.id,
      slug,
      bio: payload.bio,
      social_links: payload.socialLinks,
      audience_size: payload.audienceSize,
      reason: payload.reason,
      approved: true,
      tier: 'bronze',
      free_plan_granted: 'essentiel',
    })
    .select('*')
    .maybeSingle()

  if (insertErr || !created) {
    return NextResponse.json(
      {
        error:
          'Impossible de créer ton profil influenceur. Réessaie ou contacte-nous.',
      },
      { status: 500 }
    )
  }

  // Grant free Essentiel plan (bronze) if still free
  await sb
    .from('jurispurama_users')
    .update({ subscription_plan: 'essentiel' })
    .eq('id', profile.id)
    .eq('subscription_plan', 'free')

  await sb.from('jurispurama_notifications').insert({
    user_id: profile.id,
    type: 'influencer_approved',
    title: 'Bienvenue dans le programme influenceur',
    message:
      'Ton profil est validé. Ton plan Essentiel est offert, et ta page publique est en ligne.',
    link: '/influenceur',
  })

  return NextResponse.json({ influencer: created, alreadyApproved: false })
}
