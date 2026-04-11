import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'
import { getReferralStats, trackReferralSignup } from '@/lib/referral'

export const runtime = 'nodejs'

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json(
      { error: 'Connecte-toi pour voir tes statistiques de parrainage.' },
      { status: 401 }
    )
  }

  const { data: profile } = await supabase
    .from('jurispurama_users')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()
  if (!profile) {
    return NextResponse.json(
      { error: 'Profil introuvable.' },
      { status: 404 }
    )
  }

  const stats = await getReferralStats(profile.id)
  return NextResponse.json({ stats })
}

const PostSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('track'),
    code: z.string().trim().min(4).max(16),
  }),
  z.object({
    action: z.literal('apply_on_signup'),
    code: z.string().trim().min(4).max(16),
  }),
  z.object({
    action: z.literal('request_withdrawal'),
  }),
])

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corps JSON invalide.' }, { status: 400 })
  }
  const parsed = PostSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Action invalide.', details: parsed.error.issues },
      { status: 400 }
    )
  }

  const action = parsed.data.action

  if (action === 'track') {
    // Anonymous click tracking — future: write to a clicks table
    return NextResponse.json({ ok: true })
  }

  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json(
      { error: 'Connecte-toi pour cette action.' },
      { status: 401 }
    )
  }
  const { data: profile } = await supabase
    .from('jurispurama_users')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()
  if (!profile) {
    return NextResponse.json(
      { error: 'Profil introuvable.' },
      { status: 404 }
    )
  }

  if (action === 'apply_on_signup') {
    const ok = await trackReferralSignup({
      referralCode: parsed.data.code,
      newUserId: profile.id,
    })
    if (!ok) {
      return NextResponse.json(
        { error: 'Code parrain invalide ou inexistant.' },
        { status: 400 }
      )
    }
    return NextResponse.json({ ok: true })
  }

  if (action === 'request_withdrawal') {
    const stats = await getReferralStats(profile.id)
    if (stats.pendingCommission < 5) {
      return NextResponse.json(
        {
          error: `Retrait minimum 5 €. Tu as actuellement ${stats.pendingCommission.toFixed(
            2
          )} € disponibles.`,
        },
        { status: 400 }
      )
    }
    const sb = createServiceClient()
    await sb.from('jurispurama_payments').insert({
      user_id: profile.id,
      stripe_payment_id: `withdrawal_${Date.now()}`,
      amount: stats.pendingCommission,
      type: 'dossier',
      status: 'pending',
    })
    await sb.from('jurispurama_notifications').insert({
      user_id: profile.id,
      type: 'withdrawal_requested',
      title: 'Retrait demandé',
      message: `Ton retrait de ${stats.pendingCommission.toFixed(
        2
      )} € est en cours de traitement. Délai : 3 à 5 jours ouvrés.`,
      link: '/parrainage',
    })
    return NextResponse.json({ ok: true, amount: stats.pendingCommission })
  }

  return NextResponse.json({ error: 'Action inconnue.' }, { status: 400 })
}
