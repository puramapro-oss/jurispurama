import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'
import { sendRecommande, AR24_MODE } from '@/lib/ar24'
import { sendEmail, FROM_NOTIFS } from '@/lib/email/send'
import { DocumentSentConfirmation } from '@/lib/email/templates'

export const runtime = 'nodejs'
export const maxDuration = 120
export const dynamic = 'force-dynamic'

const BUCKET = 'jurispurama-documents'

const bodySchema = z.object({
  recipientName: z.string().trim().min(1).max(120),
  recipientEmail: z.string().trim().email().optional().or(z.literal('')),
  recipientAddress: z.object({
    street: z.string().trim().min(3).max(200),
    zip: z.string().trim().min(3).max(12),
    city: z.string().trim().min(1).max(120),
    country: z.string().trim().min(2).max(3).default('FR'),
  }),
})

function monthlyIncludedRecommandes(plan: string): number | 'unlimited' {
  if (plan === 'pro') return 3
  if (plan === 'avocat_virtuel') return 'unlimited'
  return 0
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
      { error: 'Connecte-toi pour envoyer un recommandé.' },
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
        ? (err.issues[0]?.message ?? 'Adresse destinataire invalide.')
        : 'Requête invalide.'
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  const admin = createServiceClient()
  const isAdmin = juriUser.role === 'super_admin'
  const included = monthlyIncludedRecommandes(
    juriUser.subscription_plan ?? 'free'
  )

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
          'Signe le document avant l\'envoi en recommandé — valeur juridique requise.',
      },
      { status: 400 }
    )
  }

  if (included === 0 && !isAdmin) {
    return NextResponse.json(
      {
        error:
          'L\'envoi recommandé AR est inclus dans les plans Pro (3/mois) et Avocat Virtuel (illimité). Passe à Pro pour en bénéficier.',
      },
      { status: 402 }
    )
  }

  // Check included count this month
  let outOfPlan = false
  if (typeof included === 'number' && !isAdmin) {
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
        .eq('sent_status', 'sent_recommande')
        .gte('sent_at', startOfMonth.toISOString())
      used = count ?? 0
    }

    if (used >= included) {
      // Still allow — P5 will bill 5.99€; for now flag as out of plan
      outOfPlan = true
    }
  }

  // Download signed PDF
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
      { error: 'Impossible de charger le PDF pour l\'envoi.' },
      { status: 500 }
    )
  }

  const pdfBuffer = Buffer.from(await fileData.arrayBuffer())

  // Send via AR24 (or simulation fallback)
  let result
  try {
    result = await sendRecommande({
      recipient: {
        name: body.recipientName,
        email: body.recipientEmail || null,
        street: body.recipientAddress.street,
        zip: body.recipientAddress.zip,
        city: body.recipientAddress.city,
        country: body.recipientAddress.country || 'FR',
      },
      documentPdfBuffer: pdfBuffer,
      filename: `${doc.title.replace(/[^a-z0-9-]+/gi, '-')}.pdf`,
      subject: `Recommandé — ${doc.title}`,
      metadata: {
        documentId: doc.id,
        caseId: caseRow.id,
        userId: juriUser.id,
        senderName: juriUser.full_name ?? juriUser.email ?? 'Utilisateur',
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur inconnue.'
    return NextResponse.json(
      {
        error: `Le recommandé n'a pas pu être déposé : ${msg}`,
      },
      { status: 502 }
    )
  }

  const sentAtISO = new Date().toISOString()
  const recipientLabel = `${body.recipientName} — ${body.recipientAddress.street}, ${body.recipientAddress.zip} ${body.recipientAddress.city}`

  // Update document row
  await admin
    .from('jurispurama_documents')
    .update({
      sent_status: 'sent_recommande',
      sent_at: sentAtISO,
      sent_to: recipientLabel,
      tracking_number: result.tracking_number,
      cost: result.cost,
    })
    .eq('id', doc.id)

  // Case status → envoye
  await admin
    .from('jurispurama_cases')
    .update({
      status: 'envoye',
      updated_at: sentAtISO,
    })
    .eq('id', caseRow.id)

  // Payment row (informational; P5 will bill for real when outOfPlan)
  if (outOfPlan) {
    await admin.from('jurispurama_payments').insert({
      user_id: juriUser.id,
      stripe_payment_id: null,
      amount: result.cost,
      type: 'recommande',
      status: 'simulated',
    })
  }

  // Assistant message
  const modeNote =
    result.mode === 'simulated'
      ? ' (mode démo — prêt pour AR24 réel dès configuration)'
      : ''
  await admin.from('jurispurama_messages').insert({
    case_id: caseRow.id,
    role: 'assistant',
    content: `📮 **Recommandé AR envoyé**${modeNote}

"${doc.title}" est en route vers ${body.recipientName}.
Numéro de suivi : \`${result.tracking_number}\`
Coût : ${result.cost.toFixed(2)} €${outOfPlan ? ' (hors forfait)' : ' (inclus dans ton forfait)'}

Tu recevras une notification dès que l'accusé de réception sera signé.

[Voir le document](/documents/${doc.id})`,
    attachments: null,
  })

  // Notification
  await admin.from('jurispurama_notifications').insert({
    user_id: juriUser.id,
    type: 'recommande_sent',
    title: 'Recommandé AR envoyé',
    message: `Tracking ${result.tracking_number} — en attente de l'accusé de réception.`,
    link: `/documents/${doc.id}`,
  })

  // Sender confirmation email
  await sendEmail({
    from: FROM_NOTIFS,
    to: juriUser.email ?? '',
    subject: `Recommandé AR déposé — ${doc.title}`,
    react: DocumentSentConfirmation({
      userName: juriUser.full_name ?? juriUser.email ?? 'Utilisateur',
      documentTitle: doc.title,
      recipient: recipientLabel,
      channel: 'recommande',
      trackingNumber: result.tracking_number,
      docUrl: `${appUrl()}/documents/${doc.id}`,
    }),
  }).catch(() => null)

  return NextResponse.json({
    ok: true,
    tracking_number: result.tracking_number,
    cost: result.cost,
    mode: result.mode,
    out_of_plan: outOfPlan,
    ar24_mode: AR24_MODE,
    sent_at: sentAtISO,
  })
}
