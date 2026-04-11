import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import type { CaseStatus, CaseType } from '@/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const VALID_TYPES: CaseType[] = [
  'amende',
  'travail',
  'logement',
  'consommation',
  'famille',
  'administratif',
  'fiscal',
  'penal',
  'sante',
  'assurance',
  'numerique',
  'affaires',
]

const VALID_STATUSES: CaseStatus[] = [
  'diagnostic',
  'analyse',
  'document_pret',
  'signe',
  'envoye',
  'en_attente',
  'resolu',
]

function unauthorized() {
  return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
}

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return unauthorized()

  const { data: profile } = await supabase
    .from('jurispurama_users')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()
  if (!profile) {
    return NextResponse.json({ cases: [] }, { status: 200 })
  }

  const status = req.nextUrl.searchParams.get('status')
  const type = req.nextUrl.searchParams.get('type')
  const search = req.nextUrl.searchParams.get('q')

  let query = supabase
    .from('jurispurama_cases')
    .select('*')
    .eq('user_id', profile.id)
    .order('updated_at', { ascending: false })

  if (status && VALID_STATUSES.includes(status as CaseStatus)) {
    query = query.eq('status', status)
  }
  if (type && VALID_TYPES.includes(type as CaseType)) {
    query = query.eq('type', type)
  }
  if (search) {
    query = query.ilike('summary', `%${search}%`)
  }

  const { data, error } = await query
  if (error) {
    return NextResponse.json(
      { error: 'Impossible de charger tes dossiers. Réessaie.' },
      { status: 500 }
    )
  }
  return NextResponse.json({ cases: data ?? [] })
}

const postSchema = z.object({
  type: z.enum([
    'amende',
    'travail',
    'logement',
    'consommation',
    'famille',
    'administratif',
    'fiscal',
    'penal',
    'sante',
    'assurance',
    'numerique',
    'affaires',
  ]),
  sub_type: z.string().max(80).optional(),
  summary: z.string().max(500).optional(),
})

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return unauthorized()

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

  let body: z.infer<typeof postSchema>
  try {
    body = postSchema.parse(await req.json())
  } catch {
    return NextResponse.json(
      { error: 'Données de dossier invalides.' },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from('jurispurama_cases')
    .insert({
      user_id: profile.id,
      type: body.type,
      sub_type: body.sub_type ?? null,
      summary: body.summary ?? null,
      status: 'diagnostic',
      money_saved: 0,
    })
    .select('*')
    .maybeSingle()

  if (error || !data) {
    return NextResponse.json(
      { error: 'Impossible de créer le dossier.' },
      { status: 500 }
    )
  }
  return NextResponse.json({ case: data }, { status: 201 })
}
