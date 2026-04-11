import { NextResponse, type NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'
import { SUPER_ADMIN_EMAIL } from '@/lib/constants'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || user.email !== SUPER_ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }
  const url = new URL(req.url)
  const format = url.searchParams.get('format') ?? 'json'
  const type = url.searchParams.get('type') ?? ''
  const status = url.searchParams.get('status') ?? ''

  const sb = createServiceClient()
  let query = sb
    .from('jurispurama_payments')
    .select('id, user_id, stripe_payment_id, amount, type, status, created_at')
    .order('created_at', { ascending: false })
    .limit(500)
  if (type) query = query.eq('type', type)
  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  const rows = data ?? []

  if (format === 'csv') {
    const header = 'id,user_id,stripe_payment_id,amount,type,status,created_at'
    const csv = [
      header,
      ...rows.map((r) =>
        [
          r.id,
          r.user_id,
          r.stripe_payment_id ?? '',
          r.amount,
          r.type,
          r.status,
          r.created_at,
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(',')
      ),
    ].join('\n')
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="jurispurama-payments-${Date.now()}.csv"`,
      },
    })
  }

  return NextResponse.json({ payments: rows })
}
