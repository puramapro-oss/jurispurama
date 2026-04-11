import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'
import { SUPER_ADMIN_EMAIL } from '@/lib/constants'

export const runtime = 'nodejs'

async function assertAdmin() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || user.email !== SUPER_ADMIN_EMAIL) return null
  return user
}

export async function GET(req: NextRequest) {
  const admin = await assertAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }
  const url = new URL(req.url)
  const q = url.searchParams.get('q')?.trim() ?? ''
  const plan = url.searchParams.get('plan') ?? ''
  const page = Math.max(1, Number.parseInt(url.searchParams.get('page') ?? '1', 10))
  const limit = 25
  const from = (page - 1) * limit
  const to = from + limit - 1

  const sb = createServiceClient()
  let query = sb
    .from('jurispurama_users')
    .select(
      'id, email, full_name, phone, subscription_plan, stripe_customer_id, created_at, referral_code, role',
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(from, to)

  if (q) {
    query = query.or(`email.ilike.%${q}%,full_name.ilike.%${q}%`)
  }
  if (plan && ['free', 'essentiel', 'pro', 'avocat_virtuel'].includes(plan)) {
    query = query.eq('subscription_plan', plan)
  }

  const { data, count, error } = await query
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    users: data ?? [],
    total: count ?? 0,
    page,
    limit,
  })
}

const PatchSchema = z.object({
  userId: z.string().uuid(),
  subscription_plan: z
    .enum(['free', 'essentiel', 'pro', 'avocat_virtuel'])
    .optional(),
  role: z.enum(['user', 'admin', 'super_admin']).optional(),
})

export async function PATCH(req: NextRequest) {
  const admin = await assertAdmin()
  if (!admin) {
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
      { error: 'Paramètres invalides.', details: parsed.error.issues },
      { status: 400 }
    )
  }
  const { userId, ...patch } = parsed.data
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Aucun champ à modifier.' }, { status: 400 })
  }
  const sb = createServiceClient()
  const { data, error } = await sb
    .from('jurispurama_users')
    .update(patch)
    .eq('id', userId)
    .select('id, email, subscription_plan, role')
    .maybeSingle()
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ user: data })
}
