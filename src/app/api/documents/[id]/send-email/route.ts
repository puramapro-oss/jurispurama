import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'
import { sendEmail, FROM_DOCUMENTS, FROM_NOTIFS } from '@/lib/email/send'
import {
  DocumentSentEmail,
  DocumentSentConfirmation,
} from '@/lib/email/templates'

export const runtime = 'nodejs'
export const maxDuration = 60
export const dynamic = 'force-dynamic'

const BUCKET = 'jurispurama-documents'

const bodySchema = z.object({
  recipientEmail: z.string().trim().email('Email destinataire invalide.'),
  recipientName: z.string().trim().min(1).max(120),
  subject: z.string().trim().min(1).max(200).optional(),
  bodyMessage: z.string().trim().max(4000).optional(),
})

function monthlyEmailQuota(plan: string): number | 'unlimited' {
  if (plan === 'free') return 0
  if (plan === 'essentiel') return 10
  if (plan === 'pro') return 50
  return 'unlimited'
}

function appUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ?? 'https://jurispurama.purama.dev'
  ).replace(/\/$/, '')
}

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
      { error: 'Connecte-toi pour envoyer ce document.' },
      { status: 401 }
    )
  }

  const { data: juriUser } = await supabase
    .from('jurispurama_users')
    .select('id, subscription_plan, role, full_name, email')
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
  } catch (err) {
    const msg =
      err instanceof z.ZodError
        ? (err.issues[0]?.message ?? 'Requête invalide.')
        : 'Requête invalide.'
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  const admin = createServiceClient()
  const isAdmin = juriUser.role === 'super_admin'
  const quota = monthlyEmailQuota(juriUser.subscription_plan ?? 'free')

  // Load document + ownership
  const { data: doc } = await admin
    .from('jurispurama_documents')
    .select(
      'id, case_id, title, type, storage_path, signed_pdf_url, signature_status, sent_status, deleted_at'
    )
    .eq('id', id)
    .maybeSingle()

  if (!doc || doc.deleted_at) {
    return NextResponse.json(
      { error: 'Document introuvable.' },
      { status: 404 }
    )
  }

  const { data: caseRow } = await admin
    .from('jurispurama_cases')
    .select('id, user_id')
    .eq('id', doc.case_id)
    .maybeSingle()

  if (!caseRow || caseRow.user_id !== juriUser.id) {
    return NextResponse.json(
      { error: 'Tu ne peux pas envoyer ce document.' },
      { status: 403 }
    )
  }

  if (doc.signature_status !== 'signed') {
    return NextResponse.json(
      {
        error:
          'Signe le document avant de l\'envoyer — valeur juridique requise.',
      },
      { status: 400 }
    )
  }

  // Quota check (count user's documents sent by email this month)
  if (quota === 0 && !isAdmin) {
    return NextResponse.json(
      {
        error:
          'L\'envoi par email est réservé aux abonnés Essentiel et supérieurs.',
      },
      { status: 402 }
    )
  }
  if (typeof quota === 'number' && !isAdmin) {
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { data: userCases } = await admin
      .from('jurispurama_cases')
      .select('id')
      .eq('user_id', juriUser.id)
    const caseIds = (userCases ?? []).map((c) => c.id)

    let used = 0
    if (caseIds.length > 0) {
      const { count } = await admin
        .from('jurispurama_documents')
        .select('id', { count: 'exact', head: true })
        .in('case_id', caseIds)
        .eq('sent_status', 'sent_email')
        .gte('sent_at', startOfMonth.toISOString())
      used = count ?? 0
    }

    if (used >= quota) {
      return NextResponse.json(
        {
          error: `Quota d'envois email atteint (${used}/${quota} ce mois-ci). Passe à un plan supérieur pour en envoyer davantage.`,
        },
        { status: 402 }
      )
    }
  }

  // Download signed PDF (prefer the signed variant)
  const signedPath = doc.storage_path
    ? doc.storage_path.replace(/\.pdf$/, '-signed.pdf')
    : null

  const pathToDownload = signedPath ?? doc.storage_path
  if (!pathToDownload) {
    return NextResponse.json(
      { error: 'Fichier PDF introuvable.' },
      { status: 500 }
    )
  }

  const { data: fileData, error: dlErr } = await admin.storage
    .from(BUCKET)
    .download(pathToDownload)

  if (dlErr || !fileData) {
    return NextResponse.json(
      {
        error:
          'Impossible de charger le PDF signé pour l\'envoi. Réessaie.',
      },
      { status: 500 }
    )
  }

  const pdfBuffer = Buffer.from(await fileData.arrayBuffer())
  const pdfBase64 = pdfBuffer.toString('base64')

  const senderName = juriUser.full_name ?? juriUser.email ?? 'Utilisateur'
  const senderEmail = juriUser.email ?? 'noreply@purama.dev'
  const filename = `${doc.title.replace(/[^a-z0-9-]+/gi, '-')}.pdf`
  const subject = body.subject?.trim() || `Document juridique — ${doc.title}`
  const verifyUrl = `${appUrl()}/verify/${doc.id}`

  const send = await sendEmail({
    from: FROM_DOCUMENTS,
    to: body.recipientEmail,
    replyTo: senderEmail,
    subject,
    react: DocumentSentEmail({
      senderName,
      senderEmail,
      recipientName: body.recipientName,
      documentTitle: doc.title,
      bodyMessage: body.bodyMessage ?? '',
      verifyUrl,
    }),
    attachments: [
      {
        filename,
        content: pdfBase64,
        contentType: 'application/pdf',
      },
    ],
  })

  if (!send.ok) {
    return NextResponse.json(
      {
        error: `L'envoi n'a pas abouti : ${send.error ?? 'raison inconnue'}. Réessaie dans un instant.`,
      },
      { status: 502 }
    )
  }

  const sentAtISO = new Date().toISOString()

  // Update document row
  await admin
    .from('jurispurama_documents')
    .update({
      sent_status: 'sent_email',
      sent_at: sentAtISO,
      sent_to: body.recipientEmail,
    })
    .eq('id', doc.id)

  // Case status → envoye (only if more advanced than 'signe')
  await admin
    .from('jurispurama_cases')
    .update({
      status: 'envoye',
      updated_at: sentAtISO,
    })
    .eq('id', caseRow.id)

  // Assistant message
  await admin.from('jurispurama_messages').insert({
    case_id: caseRow.id,
    role: 'assistant',
    content: `📧 **Document envoyé par email**

"${doc.title}" a été transmis à ${body.recipientName} (${body.recipientEmail}) avec le PDF signé en pièce jointe. Le destinataire peut répondre directement à ton adresse.

[Voir le document](/documents/${doc.id})`,
    attachments: null,
  })

  // Notification
  await admin.from('jurispurama_notifications').insert({
    user_id: juriUser.id,
    type: 'document_sent_email',
    title: 'Document envoyé',
    message: `"${doc.title}" a bien été envoyé à ${body.recipientEmail}.`,
    link: `/documents/${doc.id}`,
  })

  // Confirmation to sender (best-effort)
  await sendEmail({
    from: FROM_NOTIFS,
    to: senderEmail,
    subject: `Confirmation d'envoi — ${doc.title}`,
    react: DocumentSentConfirmation({
      userName: senderName,
      documentTitle: doc.title,
      recipient: body.recipientEmail,
      channel: 'email',
      trackingNumber: null,
      docUrl: `${appUrl()}/documents/${doc.id}`,
    }),
  })

  return NextResponse.json({
    ok: true,
    sent_at: sentAtISO,
    provider_id: send.id,
  })
}
