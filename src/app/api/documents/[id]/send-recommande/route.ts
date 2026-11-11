import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'
import { sendRecommande, assertAR24Configured, AR24Error } from '@/lib/ar24'
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
  return (process.env.NEXT_PUBLIC_APP_URL ?? 'https://jurispurama.purama.dev').replace(/\/$/, '')
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
    return NextResponse.json({ error: 'Connecte-toi pour envoyer un recommandé.' }, { status: 401 })
  }

  const { data: juriUser } = await supabase
    .from('jurispurama_users')
    .select('id, subscription_plan, role, full_name, email')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!juriUser) {
    return NextResponse.json({ error: 'Profil introuvable.' }, { status: 404 })
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
  const included = monthlyIncludedRecommandes(juriUser.subscription_plan ?? 'free')

  const { data: doc } = await admin
    .from('jurispurama_documents')
    .select(
      'id, case_id, title, storage_path, signed_pdf_url, signature_status, deleted_at, sent_status, tracking_number'
    )
    .eq('id', id)
    .maybeSingle()

  if (!doc || doc.deleted_at) {
    return NextResponse.json({ error: 'Document introuvable.' }, { status: 404 })
  }

  const { data: caseRow } = await admin
    .from('jurispurama_cases')
    .select('id, user_id')
    .eq('id', doc.case_id)
    .maybeSingle()

  if (!caseRow || caseRow.user_id !== juriUser.id) {
    return NextResponse.json({ error: 'Tu ne peux pas envoyer ce document.' }, { status: 403 })
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

  if (doc.sent_status === 'sent_recommande' || doc.tracking_number) {
    return NextResponse.json({
      error: 'Un dépôt ou un ancien suivi existe déjà pour ce document. Vérifie cet historique auprès du support avant un nouvel envoi.',
      code: 'reconciliation_required',
    }, { status: 409 })
  }

  try {
    assertAR24Configured()
  } catch {
    return NextResponse.json({
      error: 'Le service de recommandé est indisponible. Aucun dépôt n’a été effectué par cette demande.',
      code: 'ar24_unavailable',
    }, { status: 503 })
  }

  if (included === 0 && !isAdmin) {
    return NextResponse.json(
      {
        error:
          'L\'envoi recommandé AR est inclus dans les plans Pro (3/mois) et Premium (illimité). Passe à Pro pour en bénéficier.',
      },
      { status: 402 }
    )
  }

  if (typeof included === 'number' && !isAdmin) {
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { data: userCases, error: casesError } = await admin
      .from('jurispurama_cases')
      .select('id')
      .eq('user_id', juriUser.id)
    if (casesError || !userCases) {
      return NextResponse.json({ error: 'Impossible de vérifier les recommandés inclus.' }, { status: 503 })
    }
    const caseIds = (userCases ?? []).map((c) => c.id)

    let used = 0
    if (caseIds.length > 0) {
      const { count, error: countError } = await admin
        .from('jurispurama_documents')
        .select('id', { count: 'exact', head: true })
        .in('case_id', caseIds)
        .eq('sent_status', 'sent_recommande')
        .gte('sent_at', startOfMonth.toISOString())
      if (countError || count === null) {
        return NextResponse.json({ error: 'Impossible de vérifier les recommandés inclus.' }, { status: 503 })
      }
      used = count
    }

    if (used >= included) {
      return NextResponse.json({
        error: 'Le nombre de recommandés inclus est atteint. Le paiement hors forfait n’est pas disponible ; aucun dépôt n’a été effectué par cette demande.',
        code: 'included_quota_exhausted',
      }, { status: 402 })
    }
  }

  const signedPath = doc.storage_path
    ? doc.storage_path.replace(/\.pdf$/, '-signed.pdf')
    : null
  const pathToDownload = signedPath ?? doc.storage_path
  if (!pathToDownload) {
    return NextResponse.json({ error: 'Fichier PDF introuvable.' }, { status: 500 })
  }

  const { data: fileData, error: dlErr } = await admin.storage
    .from(BUCKET)
    .download(pathToDownload)

  if (dlErr || !fileData) {
    return NextResponse.json({ error: 'Impossible de charger le PDF pour l\'envoi.' }, { status: 500 })
  }

  const pdfBuffer = Buffer.from(await fileData.arrayBuffer())

  // A valid provider response is required before any success state is written.
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
    return NextResponse.json(
      {
        error: err instanceof AR24Error ? err.message : 'Le dépôt n’a pas pu être confirmé. Vérifie son état auprès du support avant toute nouvelle tentative.',
        code: err instanceof AR24Error ? err.code : 'ar24_unconfirmed',
      },
      { status: err instanceof AR24Error ? err.status : 502 }
    )
  }

  const sentAtISO = new Date().toISOString()
  const recipientLabel = `${body.recipientName} — ${body.recipientAddress.street}, ${body.recipientAddress.zip} ${body.recipientAddress.city}`

  const { data: savedDocument, error: documentUpdateError } = await admin
    .from('jurispurama_documents')
    .update({
      sent_status: 'sent_recommande',
      sent_at: sentAtISO,
      sent_to: recipientLabel,
      tracking_number: result.tracking_number,
      cost: result.cost,
    })
    .eq('id', doc.id)
    .select('id')
    .maybeSingle()

  if (documentUpdateError || !savedDocument) {
    return NextResponse.json({
      error: 'Le fournisseur a confirmé le dépôt, mais son enregistrement local a échoué. Ne renvoie pas le document ; contacte le support avec la référence indiquée.',
      code: 'reconciliation_required',
      tracking_number: result.tracking_number,
    }, { status: 503 })
  }

  await admin
    .from('jurispurama_cases')
    .update({
      status: 'envoye',
      updated_at: sentAtISO,
    })
    .eq('id', caseRow.id)

  await admin.from('jurispurama_messages').insert({
    case_id: caseRow.id,
    role: 'assistant',
    content: `📮 **Dépôt du recommandé confirmé par le fournisseur**

"${doc.title}" est en route vers ${body.recipientName}.
Numéro de suivi : \`${result.tracking_number}\`
Coût fournisseur communiqué : ${result.cost.toFixed(2)} € (inclus dans ton forfait)

Une notification pourra être envoyée si le fournisseur confirme la remise. Le dépôt ne prouve pas la réception.

[Voir le document](/documents/${doc.id})`,
    attachments: null,
  })

  await admin.from('jurispurama_notifications').insert({
    user_id: juriUser.id,
    type: 'recommande_sent',
    title: 'Dépôt du recommandé confirmé',
    message: `Suivi ${result.tracking_number} — en attente de confirmation de remise.`,
    link: `/documents/${doc.id}`,
  })

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
    out_of_plan: false,
    ar24_mode: result.mode,
    sent_at: sentAtISO,
  })
}
