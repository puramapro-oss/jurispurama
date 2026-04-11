import { NextResponse, type NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BUCKET = 'jurispurama-documents'

async function loadAuth() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { user: null, supabase, juriUser: null as null | { id: string } }
  const { data: juriUser } = await supabase
    .from('jurispurama_users')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()
  return { user, supabase, juriUser }
}

async function loadDocForUser(id: string, userIdInternal: string) {
  const admin = createServiceClient()
  const { data: doc } = await admin
    .from('jurispurama_documents')
    .select(
      'id, case_id, type, title, content, generated_data, pdf_url, signed_pdf_url, signature_status, signature_request_id, sent_status, sent_at, sent_to, tracking_number, ar_received_at, cost, storage_path, created_at, deleted_at'
    )
    .eq('id', id)
    .maybeSingle()
  if (!doc || doc.deleted_at) return null
  // Verify ownership via case join
  const { data: caseRow } = await admin
    .from('jurispurama_cases')
    .select('id, user_id, summary, type, sub_type, status')
    .eq('id', doc.case_id)
    .maybeSingle()
  if (!caseRow || caseRow.user_id !== userIdInternal) return null
  return { doc, caseRow }
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params
  const { user, juriUser } = await loadAuth()
  if (!user || !juriUser) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  }

  const result = await loadDocForUser(id, juriUser.id)
  if (!result) {
    return NextResponse.json(
      { error: 'Document introuvable.' },
      { status: 404 }
    )
  }

  const { doc, caseRow } = result

  const admin = createServiceClient()
  let freshUrl: string | null = doc.pdf_url
  let freshSignedUrl: string | null = doc.signed_pdf_url
  if (doc.storage_path) {
    const { data: signed } = await admin.storage
      .from(BUCKET)
      .createSignedUrl(doc.storage_path, 60 * 60 * 24) // 24h fresh
    if (signed?.signedUrl) freshUrl = signed.signedUrl

    if (doc.signature_status === 'signed') {
      const signedPath = doc.storage_path.replace(/\.pdf$/, '-signed.pdf')
      const { data: signed2 } = await admin.storage
        .from(BUCKET)
        .createSignedUrl(signedPath, 60 * 60 * 24)
      if (signed2?.signedUrl) freshSignedUrl = signed2.signedUrl
    }
  }

  return NextResponse.json({
    document: {
      ...doc,
      pdf_url: freshUrl,
      signed_pdf_url: freshSignedUrl,
    },
    case: caseRow,
  })
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params
  const { user, juriUser } = await loadAuth()
  if (!user || !juriUser) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  }

  const result = await loadDocForUser(id, juriUser.id)
  if (!result) {
    return NextResponse.json(
      { error: 'Document introuvable.' },
      { status: 404 }
    )
  }

  const admin = createServiceClient()
  // Soft delete
  await admin
    .from('jurispurama_documents')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  // Remove storage assets (original + signed variant if any)
  if (result.doc.storage_path) {
    const paths = [result.doc.storage_path]
    const signedPath = result.doc.storage_path.replace(/\.pdf$/, '-signed.pdf')
    if (signedPath !== result.doc.storage_path) paths.push(signedPath)
    await admin.storage.from(BUCKET).remove(paths)
  }

  return NextResponse.json({ ok: true })
}
