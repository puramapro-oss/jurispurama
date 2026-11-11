import { NextResponse, type NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { pollStatus, assertAR24Configured, AR24Error } from '@/lib/ar24'
import { sendEmail, FROM_NOTIFS } from '@/lib/email/send'
import { ARReceivedEmail } from '@/lib/email/templates'

export const runtime = 'nodejs'
export const maxDuration = 120
export const dynamic = 'force-dynamic'

function isAuthorizedCron(request: NextRequest): boolean {
  const auth = request.headers.get('authorization') ?? ''
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return auth === `Bearer ${secret}`
}

function appUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ?? 'https://jurispurama.purama.dev'
  ).replace(/\/$/, '')
}

export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  try {
    assertAR24Configured()
  } catch {
    return NextResponse.json({ error: 'Le suivi des recommandés est indisponible.', code: 'ar24_unavailable' }, { status: 503 })
  }

  const admin = createServiceClient()

  const { data: pending, error: pendingError } = await admin
    .from('jurispurama_documents')
    .select('id, case_id, title, tracking_number, sent_at, sent_to')
    .eq('sent_status', 'sent_recommande')
    .is('ar_received_at', null)
    .is('deleted_at', null)
    .not('tracking_number', 'is', null)
    .limit(200)

  if (pendingError) {
    return NextResponse.json({ error: 'Les dépôts à vérifier n’ont pas pu être lus.' }, { status: 503 })
  }

  let updated = 0
  const results: Array<{ id: string; received: boolean; persisted?: boolean; error?: string }> = []

  for (const d of pending ?? []) {
    if (!d.tracking_number || !d.sent_at) continue
    let status
    try {
      status = await pollStatus(d.tracking_number, d.sent_at)
    } catch (err) {
      results.push({ id: d.id, received: false, error: err instanceof AR24Error ? err.code : 'status_unconfirmed' })
      continue
    }
    if (!status.received || !status.received_at) {
      results.push({ id: d.id, received: false })
      continue
    }

    const { data: confirmed, error: updateError } = await admin
      .from('jurispurama_documents')
      .update({ ar_received_at: status.received_at })
      .eq('id', d.id)
      .is('ar_received_at', null)
      .select('id')
      .maybeSingle()

    if (updateError || !confirmed) {
      results.push({
        id: d.id,
        received: true,
        persisted: false,
        error: updateError ? 'receipt_update_failed' : 'receipt_update_not_applied',
      })
      continue
    }
    results.push({ id: d.id, received: true, persisted: true })
    updated += 1

    // Join case → user for email notification
    const { data: caseRow } = await admin
      .from('jurispurama_cases')
      .select('id, user_id')
      .eq('id', d.case_id)
      .maybeSingle()

    if (!caseRow) continue

    const { data: juriUser } = await admin
      .from('jurispurama_users')
      .select('id, full_name, email')
      .eq('id', caseRow.user_id)
      .maybeSingle()

    if (!juriUser?.email) continue

    await admin.from('jurispurama_messages').insert({
      case_id: caseRow.id,
      role: 'assistant',
      content: `📬 **Remise signalée par le fournisseur**

Ton recommandé "${d.title}" a bien été remis ${
        d.sent_to ? `à ${d.sent_to}` : ''
      } le ${new Date(status.received_at).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })}, selon le suivi du fournisseur. Ce statut ne confirme pas l’archivage d’une preuve d’accusé de réception.

[Voir le document](/documents/${d.id})`,
      attachments: null,
    })

    await admin.from('jurispurama_notifications').insert({
      user_id: juriUser.id,
      type: 'ar_received',
      title: 'Remise signalée',
      message: `Le fournisseur signale la remise de "${d.title}".`,
      link: `/documents/${d.id}`,
    })

    await sendEmail({
      from: FROM_NOTIFS,
      to: juriUser.email,
      subject: `Suivi du recommandé — ${d.title}`,
      react: ARReceivedEmail({
        userName: juriUser.full_name ?? juriUser.email,
        documentTitle: d.title,
        recipient: d.sent_to ?? 'destinataire',
        receivedAtISO: status.received_at,
        docUrl: `${appUrl()}/documents/${d.id}`,
      }),
    }).catch(() => null)

  }

  const failed = results.filter((result) => result.error).length
  return NextResponse.json({
    ok: failed === 0,
    job: 'check-ar-status',
    scanned: pending?.length ?? 0,
    updated,
    failed,
    results,
    timestamp: Date.now(),
  }, { status: failed === 0 ? 200 : 503 })
}
