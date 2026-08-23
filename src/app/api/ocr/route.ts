import { NextResponse, type NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'
import { APP_SCHEMA } from '@/lib/constants'
import { rateLimit } from '@/lib/rate-limit'
import { parseFileFromRequest } from '@/lib/ocr/parse-file'
import { uploadFileToStorage } from '@/lib/ocr/upload-file'
import { analyzeDocument } from '@/lib/ocr/analyze-document'
import { saveScan } from '@/lib/ocr/save-scan'
import { injectMessageInCase } from '@/lib/ocr/inject-message'
import { BUCKET } from '@/lib/ocr/constants'

export const runtime = 'nodejs'
export const maxDuration = 120
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  // Auth
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json(
      { error: 'Connecte-toi pour utiliser le scanner.' },
      { status: 401 }
    )
  }

  // Rate limit: 10 uploads/minute per user
  const { allowed } = await rateLimit(`ocr:${user.id}`, 10, 60)
  if (!allowed) {
    return NextResponse.json(
      { error: 'Trop de scans. Réessaie dans une minute.' },
      { status: 429 }
    )
  }

  const { data: juriUser } = await supabase
    .from('jurispurama_users')
    .select('id, subscription_plan, role, email')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!juriUser) {
    return NextResponse.json(
      { error: 'Profil JurisPurama introuvable.' },
      { status: 404 }
    )
  }

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return NextResponse.json(
      { error: 'Requête invalide — fichier manquant.' },
      { status: 400 }
    )
  }

  const parsed = await parseFileFromRequest(form)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status })
  }

  const { file, caseId, context, mime, buffer, base64 } = parsed.data

  const uploaded = await uploadFileToStorage(
    buffer,
    mime,
    file.name,
    user.id,
    caseId
  )

  if (!uploaded.success) {
    return NextResponse.json({ error: uploaded.error }, { status: 500 })
  }

  const { storagePath, signedUrl } = uploaded

  let result
  try {
    result = await analyzeDocument(base64, mime, context)
  } catch (err) {
    const admin = createServiceClient()
    await admin.storage.from(BUCKET).remove([storagePath])
    const msg = err instanceof Error ? err.message : 'erreur inconnue'
    return NextResponse.json(
      {
        error: `JurisIA n'a pas pu analyser ce document (${msg}). Réessaie avec une photo plus nette ou un PDF mieux cadré.`,
      },
      { status: 502 }
    )
  }

  const scanId = await saveScan(
    juriUser.id,
    caseId,
    file.name,
    storagePath,
    mime,
    result
  )

  if (caseId) {
    await injectMessageInCase(
      juriUser.id,
      caseId,
      scanId,
      result,
      file.name,
      signedUrl,
      mime
    )
  }

  return NextResponse.json({
    scan_id: scanId,
    signed_url: signedUrl,
    storage_path: storagePath,
    document_type: result.document_type,
    summary: result.summary,
    extracted_text: result.extracted_text,
    extracted_fields: result.extracted_fields,
    insights: result.insights,
    recommended_actions: result.recommended_actions,
    deadlines: result.deadlines ?? [],
  })
}

// GET — list recent scans (last 10 for history page)
export async function GET() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  }

  const { data: juriUser } = await supabase
    .from('jurispurama_users')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()
  if (!juriUser) {
    return NextResponse.json({ scans: [] })
  }

  const admin = createServiceClient()
  const { data: scans } = await admin
    .from('jurispurama_scans')
    .select(
      'id, case_id, file_name, file_path, mime_type, detected_type, insights, created_at'
    )
    .eq('user_id', juriUser.id)
    .order('created_at', { ascending: false })
    .limit(10)

  // Sign URLs fresh
  const withUrls = await Promise.all(
    (scans ?? []).map(async (s) => {
      const { data: signed } = await admin.storage
        .from(BUCKET)
        .createSignedUrl(s.file_path, 3600)
      return { ...s, signed_url: signed?.signedUrl ?? null }
    })
  )

  // Silence unused APP_SCHEMA import
  void APP_SCHEMA

  return NextResponse.json({ scans: withUrls })
}
