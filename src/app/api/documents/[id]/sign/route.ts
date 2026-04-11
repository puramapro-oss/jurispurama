import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'
import {
  clientIpFromHeaders,
  dataUrlToBuffer,
  embedSignatureOnPdf,
  hashSignatureBytes,
} from '@/lib/signature'

export const runtime = 'nodejs'
export const maxDuration = 60
export const dynamic = 'force-dynamic'

const BUCKET = 'jurispurama-documents'

const bodySchema = z.object({
  signatureDataUrl: z
    .string()
    .startsWith('data:image/png;base64,')
    .max(3_000_000, 'Signature trop volumineuse.'),
  consent: z.literal(true, {
    message: 'Le consentement explicite est requis.',
  }),
})

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params

  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { error: 'Connecte-toi pour signer ce document.' },
      { status: 401 }
    )
  }

  const { data: juriUser } = await supabase
    .from('jurispurama_users')
    .select('id, full_name, email')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!juriUser) {
    return NextResponse.json(
      { error: 'Profil introuvable.' },
      { status: 404 }
    )
  }

  let body: z.infer<typeof bodySchema>
  try {
    const json = await req.json()
    body = bodySchema.parse(json)
  } catch {
    return NextResponse.json(
      {
        error:
          'Requête invalide. La signature ou le consentement sont manquants.',
      },
      { status: 400 }
    )
  }

  const admin = createServiceClient()

  // Load document + verify ownership via case
  const { data: doc } = await admin
    .from('jurispurama_documents')
    .select(
      'id, case_id, title, storage_path, signed_pdf_url, signature_status, deleted_at'
    )
    .eq('id', id)
    .maybeSingle()

  if (!doc || doc.deleted_at) {
    return NextResponse.json(
      { error: 'Document introuvable.' },
      { status: 404 }
    )
  }

  if (doc.signature_status === 'signed') {
    return NextResponse.json(
      { error: 'Ce document est déjà signé.' },
      { status: 409 }
    )
  }

  const { data: caseRow } = await admin
    .from('jurispurama_cases')
    .select('id, user_id')
    .eq('id', doc.case_id)
    .maybeSingle()

  if (!caseRow || caseRow.user_id !== juriUser.id) {
    return NextResponse.json(
      { error: 'Tu ne peux pas signer ce document.' },
      { status: 403 }
    )
  }

  if (!doc.storage_path) {
    return NextResponse.json(
      { error: 'Ce document n\'a pas de fichier source.' },
      { status: 400 }
    )
  }

  // Decode signature PNG
  const signaturePngBytes = dataUrlToBuffer(body.signatureDataUrl)
  if (!signaturePngBytes) {
    return NextResponse.json(
      { error: 'Format de signature invalide.' },
      { status: 400 }
    )
  }

  // Download original PDF
  const { data: pdfFile, error: dlErr } = await admin.storage
    .from(BUCKET)
    .download(doc.storage_path)

  if (dlErr || !pdfFile) {
    return NextResponse.json(
      { error: 'Impossible de charger le PDF original.' },
      { status: 500 }
    )
  }

  const pdfBuffer = Buffer.from(await pdfFile.arrayBuffer())

  // Timing + audit metadata
  const signedAtISO = new Date().toISOString()
  const ipAddress = clientIpFromHeaders(req.headers)
  const userAgent = req.headers.get('user-agent') ?? null
  const signerFullName = juriUser.full_name ?? juriUser.email ?? 'Utilisateur'

  // Embed signature into PDF
  let signedPdf: Buffer
  try {
    signedPdf = await embedSignatureOnPdf({
      pdfBuffer,
      signaturePngBytes,
      signerFullName,
      signedAtISO,
      ipAddress,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'erreur inconnue'
    return NextResponse.json(
      { error: `Impossible de générer le PDF signé : ${msg}` },
      { status: 500 }
    )
  }

  // Upload signed PDF
  const signedPath = doc.storage_path.replace(/\.pdf$/, '-signed.pdf')
  const { error: upErr } = await admin.storage
    .from(BUCKET)
    .upload(signedPath, signedPdf, {
      contentType: 'application/pdf',
      upsert: true,
    })

  if (upErr) {
    return NextResponse.json(
      { error: `Impossible de stocker le document signé : ${upErr.message}` },
      { status: 500 }
    )
  }

  // Upload signature PNG in audit folder
  const sigPngPath = `${user.id}/signatures/${doc.id}.png`
  await admin.storage
    .from(BUCKET)
    .upload(sigPngPath, signaturePngBytes, {
      contentType: 'image/png',
      upsert: true,
    })

  // Signed URL (30j)
  const { data: signedUrl } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(signedPath, 60 * 60 * 24 * 30)

  // Hash + audit row
  const signatureHash = hashSignatureBytes(
    signerFullName,
    signedPdf,
    signedAtISO
  )

  await admin.from('jurispurama_signatures').insert({
    document_id: doc.id,
    user_id: juriUser.id,
    signature_png_path: sigPngPath,
    signature_hash: signatureHash,
    signed_at: signedAtISO,
    ip_address: ipAddress,
    user_agent: userAgent,
  })

  // Update document row
  await admin
    .from('jurispurama_documents')
    .update({
      signed_pdf_url: signedUrl?.signedUrl ?? null,
      signature_status: 'signed',
      signature_request_id: signatureHash.slice(0, 24),
    })
    .eq('id', doc.id)

  // Update case status
  await admin
    .from('jurispurama_cases')
    .update({
      status: 'signe',
      updated_at: new Date().toISOString(),
    })
    .eq('id', caseRow.id)

  // Assistant message in chat
  await admin.from('jurispurama_messages').insert({
    case_id: caseRow.id,
    role: 'assistant',
    content: `✍️ **Document signé électroniquement**

"${doc.title}" a été signé le ${new Date(signedAtISO).toLocaleDateString(
      'fr-FR',
      { day: 'numeric', month: 'long', year: 'numeric' }
    )}. Valeur légale équivalente à une signature manuscrite (Art. 1366 du Code civil).

[Voir le document signé](/documents/${doc.id})`,
    attachments: null,
  })

  // Notification
  await admin.from('jurispurama_notifications').insert({
    user_id: juriUser.id,
    type: 'document_signed',
    title: 'Document signé',
    message: `"${doc.title}" est maintenant signé électroniquement.`,
    link: `/documents/${doc.id}`,
  })

  return NextResponse.json({
    ok: true,
    signed_pdf_url: signedUrl?.signedUrl ?? null,
    signed_at: signedAtISO,
    signature_hash: signatureHash,
  })
}
