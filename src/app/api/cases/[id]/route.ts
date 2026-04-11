import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import type { CaseStatus } from '@/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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

async function getOwnedCase(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  authUserId: string,
  caseId: string
) {
  const { data: profile } = await supabase
    .from('jurispurama_users')
    .select('id')
    .eq('auth_user_id', authUserId)
    .maybeSingle()
  if (!profile) return null
  const { data: row } = await supabase
    .from('jurispurama_cases')
    .select('*')
    .eq('id', caseId)
    .eq('user_id', profile.id)
    .maybeSingle()
  return row
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return unauthorized()

  const caseRow = await getOwnedCase(supabase, user.id, id)
  if (!caseRow) {
    return NextResponse.json({ error: 'Dossier introuvable.' }, { status: 404 })
  }

  const { data: messages } = await supabase
    .from('jurispurama_messages')
    .select('*')
    .eq('case_id', id)
    .order('created_at', { ascending: true })

  const { data: documents } = await supabase
    .from('jurispurama_documents')
    .select('*')
    .eq('case_id', id)
    .order('created_at', { ascending: false })

  return NextResponse.json({
    case: caseRow,
    messages: messages ?? [],
    documents: documents ?? [],
  })
}

const patchSchema = z.object({
  status: z
    .enum([
      'diagnostic',
      'analyse',
      'document_pret',
      'signe',
      'envoye',
      'en_attente',
      'resolu',
    ])
    .optional(),
  summary: z.string().max(500).optional(),
  sub_type: z.string().max(80).optional(),
})

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return unauthorized()

  const caseRow = await getOwnedCase(supabase, user.id, id)
  if (!caseRow) {
    return NextResponse.json({ error: 'Dossier introuvable.' }, { status: 404 })
  }

  let body: z.infer<typeof patchSchema>
  try {
    body = patchSchema.parse(await req.json())
  } catch {
    return NextResponse.json({ error: 'Données invalides.' }, { status: 400 })
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.status && VALID_STATUSES.includes(body.status)) {
    patch.status = body.status
  }
  if (body.summary !== undefined) patch.summary = body.summary
  if (body.sub_type !== undefined) patch.sub_type = body.sub_type

  const { data, error } = await supabase
    .from('jurispurama_cases')
    .update(patch)
    .eq('id', id)
    .select('*')
    .maybeSingle()

  if (error || !data) {
    return NextResponse.json(
      { error: 'Impossible de mettre à jour.' },
      { status: 500 }
    )
  }
  return NextResponse.json({ case: data })
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return unauthorized()

  const caseRow = await getOwnedCase(supabase, user.id, id)
  if (!caseRow) {
    return NextResponse.json({ error: 'Dossier introuvable.' }, { status: 404 })
  }

  const { error } = await supabase
    .from('jurispurama_cases')
    .update({
      status: 'resolu',
      summary: `[archivé] ${caseRow.summary ?? ''}`.slice(0, 500),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    return NextResponse.json(
      { error: 'Impossible d’archiver le dossier.' },
      { status: 500 }
    )
  }
  return NextResponse.json({ ok: true })
}
