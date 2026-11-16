import { NextResponse, type NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { pollStatus, assertAR24TrackingConfigured, AR24Error } from '@/lib/ar24'
import { createAR24Budget, AR24BudgetError, AR24_POLL_LIMIT_MS } from '@/lib/ar24-budget'
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
    assertAR24TrackingConfigured()
  } catch {
    return NextResponse.json({ error: 'Le suivi des recommandés est indisponible.', code: 'ar24_unavailable' }, { status: 503 })
  }

  const budget = createAR24Budget()
  const admin = createServiceClient()

  const pendingResult = await budget.run(signal => admin
    .from('jurispurama_documents')
    .select('id, case_id, title, tracking_number, sent_at, sent_to')
    .eq('sent_status', 'sent_recommande')
    .is('ar_received_at', null)
    .is('deleted_at', null)
    .not('tracking_number', 'is', null)
    .limit(200)
    .abortSignal(signal)).catch(() => null)

  if (!pendingResult || pendingResult.error) {
    return NextResponse.json({ error: 'Les dépôts à vérifier n’ont pas pu être lus.' }, { status: 503 })
  }
  const pending = pendingResult.data ?? []

  let updated = 0
  let attempted = 0
  const results: Array<{ id: string; received: boolean; persisted?: boolean; error?: string }> = []

  for (const d of pending) {
    if (budget.remaining() <= 0) break
    attempted++
    if (!d.tracking_number || !d.sent_at) continue
    let status
    try {
      status = await budget.run(signal => pollStatus(d.tracking_number, d.sent_at, signal), AR24_POLL_LIMIT_MS)
    } catch (err) {
      results.push({ id: d.id, received: false, error: err instanceof AR24BudgetError
        ? 'status_time_budget_exhausted' : err instanceof AR24Error ? err.code : 'status_unconfirmed' })
      continue
    }
    if (!status.received || !status.received_at) {
      results.push({ id: d.id, received: false })
      continue
    }
    const receivedAt = status.received_at

    const saved = await budget.run(signal => admin
      .from('jurispurama_documents')
      .update({ ar_received_at: receivedAt })
      .eq('id', d.id)
      .is('ar_received_at', null)
      .select('id')
      .abortSignal(signal)
      .maybeSingle()).catch(() => null)

    if (!saved || saved.error || !saved.data) {
      results.push({
        id: d.id,
        received: true,
        persisted: false,
        error: !saved ? 'receipt_update_unconfirmed' : saved.error ? 'receipt_update_failed' : 'receipt_update_not_applied',
      })
      continue
    }
    const receiptResult: { id: string; received: boolean; persisted: boolean; error?: string } = { id: d.id, received: true, persisted: true }
    results.push(receiptResult)
    updated += 1

    // Notification failures do not undo a confirmed receipt or trigger another provider call.
    try {
      const { data: caseRow, error: caseError } = await budget.run(signal => admin
        .from('jurispurama_cases')
        .select('id, user_id')
        .eq('id', d.case_id)
        .abortSignal(signal)
        .maybeSingle())

      if (caseError) throw new Error('notification_lookup_failed')
      if (!caseRow) continue

      const { data: juriUser, error: userError } = await budget.run(signal => admin
        .from('jurispurama_users')
        .select('id, full_name, email')
        .eq('id', caseRow.user_id)
        .abortSignal(signal)
        .maybeSingle())

      if (userError) throw new Error('notification_lookup_failed')
      if (!juriUser?.email) continue

      const { error: messageError } = await budget.run(signal => admin.from('jurispurama_messages').insert({
        case_id: caseRow.id,
        role: 'assistant',
        content: `📬 **Remise signalée par le fournisseur**

Ton recommandé "${d.title}" a bien été remis ${
          d.sent_to ? `à ${d.sent_to}` : ''
      } le ${new Date(receivedAt).toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })}, selon le suivi du fournisseur. Ce statut ne confirme pas l’archivage d’une preuve d’accusé de réception.

[Voir le document](/documents/${d.id})`,
        attachments: null,
      }).abortSignal(signal))
      if (messageError) throw new Error('notification_write_failed')

      const { error: notificationError } = await budget.run(signal => admin.from('jurispurama_notifications').insert({
        user_id: juriUser.id,
        type: 'ar_received',
        title: 'Remise signalée',
        message: `Le fournisseur signale la remise de "${d.title}".`,
        link: `/documents/${d.id}`,
      }).abortSignal(signal))
      if (notificationError) throw new Error('notification_write_failed')

      const emailed = await budget.run(() => sendEmail({
        from: FROM_NOTIFS,
        to: juriUser.email,
        subject: `Suivi du recommandé — ${d.title}`,
        react: ARReceivedEmail({
          userName: juriUser.full_name ?? juriUser.email,
          documentTitle: d.title,
          recipient: d.sent_to ?? 'destinataire',
          receivedAtISO: receivedAt,
          docUrl: `${appUrl()}/documents/${d.id}`,
        }),
      }))
      if (!emailed.ok) throw new Error('notification_email_unconfirmed')
    } catch {
      // Resend may complete after our deadline; do not retry an uncertain email here.
      receiptResult.error = 'receipt_notification_unconfirmed'
    }

  }

  const failed = results.filter((result) => result.error).length
  const deferred = pending.length - attempted
  const ok = failed === 0 && deferred === 0
  return NextResponse.json({
    ok,
    job: 'check-ar-status',
    scanned: pending?.length ?? 0,
    updated,
    failed,
    deferred,
    budget_exhausted: budget.remaining() <= 0,
    results,
    timestamp: Date.now(),
  }, { status: ok ? 200 : 503 })
}
