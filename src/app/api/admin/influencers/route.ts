import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'
import { SUPER_ADMIN_EMAIL } from '@/lib/constants'

export const runtime = 'nodejs'

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || user.email !== SUPER_ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }

  const sb = createServiceClient()
  const { data: influencers } = await sb
    .from('jurispurama_influencers')
    .select(
      'id, user_id, slug, bio, tier, total_clicks, total_signups, total_conversions, total_commissions, approved, created_at'
    )
    .order('total_commissions', { ascending: false })
    .limit(200)

  const userIds = (influencers ?? []).map((i) => i.user_id)
  const { data: users } = userIds.length
    ? await sb
        .from('jurispurama_users')
        .select('id, email, full_name')
        .in('id', userIds)
    : { data: [] as Array<{ id: string; email: string; full_name: string | null }> }

  const map = new Map<string, { email: string; full_name: string | null }>()
  ;(users ?? []).forEach((u) => map.set(u.id, { email: u.email, full_name: u.full_name }))

  const enriched = (influencers ?? []).map((i) => ({
    ...i,
    email: map.get(i.user_id)?.email ?? '—',
    full_name: map.get(i.user_id)?.full_name ?? '—',
  }))

  // Pending withdrawals table
  const { data: withdrawals } = await sb
    .from('jurispurama_payments')
    .select('id, user_id, amount, status, created_at, stripe_payment_id')
    .like('stripe_payment_id', 'withdrawal_%')
    .order('created_at', { ascending: false })
    .limit(100)

  return NextResponse.json({
    influencers: enriched,
    withdrawals: withdrawals ?? [],
  })
}

const PatchSchema = z.object({
  paymentId: z.string().uuid(),
  status: z.enum(['pending', 'succeeded', 'paid', 'rejected']),
})

export async function PATCH(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || user.email !== SUPER_ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corps JSON invalide.' }, { status: 400 })
  }
  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Paramètres invalides.' },
      { status: 400 }
    )
  }
  const sb = createServiceClient()
  const { error } = await sb
    .from('jurispurama_payments')
    .update({ status: parsed.data.status })
    .eq('id', parsed.data.paymentId)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
