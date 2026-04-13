import { NextResponse, type NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const url = new URL(req.url)
  const profil = url.searchParams.get('profil')
  const situation = url.searchParams.get('situation')

  let query = supabase
    .from('jurispurama_aides')
    .select('*')
    .eq('active', true)
    .order('montant_max', { ascending: false, nullsFirst: false })

  if (profil) {
    query = query.contains('profil_eligible', [profil])
  }
  if (situation) {
    query = query.contains('situation_eligible', [situation])
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json(
      { error: 'Impossible de charger les aides disponibles.' },
      { status: 500 }
    )
  }

  return NextResponse.json({ aides: data ?? [] })
}
