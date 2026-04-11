import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'
import { SUPER_ADMIN_EMAIL } from '@/lib/constants'

export const runtime = 'nodejs'

interface DailyRevenue {
  date: string
  amount: number
}

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || user.email !== SUPER_ADMIN_EMAIL) {
    return NextResponse.json(
      { error: 'Accès réservé à l\'administration.' },
      { status: 403 }
    )
  }

  const sb = createServiceClient()

  const now = new Date()
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const startLast30 = new Date(
    now.getTime() - 30 * 24 * 60 * 60 * 1000
  ).toISOString()

  // Users
  const [{ count: usersTotal }, { count: usersActive30d }] = await Promise.all([
    sb.from('jurispurama_users').select('id', { count: 'exact', head: true }),
    sb
      .from('jurispurama_users')
      .select('id', { count: 'exact', head: true })
      .gte('updated_at', startLast30),
  ])

  // Plans breakdown
  const { data: plansRaw } = await sb
    .from('jurispurama_users')
    .select('subscription_plan')
  const plansBreakdown: Record<string, number> = {
    free: 0,
    essentiel: 0,
    pro: 0,
    avocat_virtuel: 0,
  }
  ;(plansRaw ?? []).forEach((r) => {
    const k = (r.subscription_plan as string) || 'free'
    plansBreakdown[k] = (plansBreakdown[k] ?? 0) + 1
  })
  const subscribers =
    plansBreakdown.essentiel + plansBreakdown.pro + plansBreakdown.avocat_virtuel

  // Payments totals
  const { data: payments } = await sb
    .from('jurispurama_payments')
    .select('amount, type, status, created_at')
    .gte('created_at', startLast30)

  const paymentsList = payments ?? []
  const revenueTotal = paymentsList
    .filter((p) => p.status === 'succeeded' || p.status === 'paid')
    .reduce((a, b) => a + Number(b.amount ?? 0), 0)
  const mrrMonth = paymentsList
    .filter(
      (p) =>
        (p.status === 'succeeded' || p.status === 'paid') &&
        p.type === 'subscription' &&
        p.created_at >= startMonth
    )
    .reduce((a, b) => a + Number(b.amount ?? 0), 0)

  // Daily revenue (30 days)
  const daily: Record<string, number> = {}
  for (let i = 29; i >= 0; i -= 1) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
    const key = d.toISOString().slice(0, 10)
    daily[key] = 0
  }
  paymentsList
    .filter((p) => p.status === 'succeeded' || p.status === 'paid')
    .forEach((p) => {
      const key = String(p.created_at).slice(0, 10)
      if (key in daily) daily[key] += Number(p.amount ?? 0)
    })
  const dailyRevenue: DailyRevenue[] = Object.entries(daily).map(
    ([date, amount]) => ({ date, amount })
  )

  // Cases & documents counts
  const [{ count: casesTotal }, { count: casesResolu }, { count: docsTotal }] =
    await Promise.all([
      sb.from('jurispurama_cases').select('id', { count: 'exact', head: true }),
      sb
        .from('jurispurama_cases')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'resolu'),
      sb
        .from('jurispurama_documents')
        .select('id', { count: 'exact', head: true }),
    ])

  // Money saved total
  const { data: savedRows } = await sb
    .from('jurispurama_cases')
    .select('money_saved')
  const moneySaved = (savedRows ?? []).reduce(
    (a, b) => a + Number(b.money_saved ?? 0),
    0
  )

  // Recent signups
  const { data: recentSignups } = await sb
    .from('jurispurama_users')
    .select('id, email, full_name, subscription_plan, created_at')
    .order('created_at', { ascending: false })
    .limit(10)

  // Recent payments
  const { data: recentPayments } = await sb
    .from('jurispurama_payments')
    .select('id, user_id, amount, type, status, created_at, stripe_payment_id')
    .order('created_at', { ascending: false })
    .limit(10)

  // Conversion rate
  const conversionRate =
    (usersTotal ?? 0) > 0
      ? Math.round((subscribers / (usersTotal ?? 1)) * 1000) / 10
      : 0

  return NextResponse.json({
    users: {
      total: usersTotal ?? 0,
      active30d: usersActive30d ?? 0,
      subscribers,
      plansBreakdown,
    },
    revenue: {
      mrrEstimate: mrrMonth,
      arrEstimate: mrrMonth * 12,
      last30d: revenueTotal,
      conversionRate,
    },
    cases: {
      total: casesTotal ?? 0,
      resolu: casesResolu ?? 0,
      documentsTotal: docsTotal ?? 0,
      moneySaved,
    },
    dailyRevenue,
    recentSignups: recentSignups ?? [],
    recentPayments: recentPayments ?? [],
  })
}
