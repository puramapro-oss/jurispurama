import { NextResponse, type NextRequest } from 'next/server'
import { render } from '@react-email/components'
import { createServiceClient } from '@/lib/supabase'
import { pollStatus, assertAR24TrackingConfigured, AR24Error } from '@/lib/ar24'
import { createAR24Budget, AR24BudgetError, AR24_POLL_LIMIT_MS } from '@/lib/ar24-budget'
import { assertAR24EmailConfigured, sendAR24ReceiptEmail, AR24EmailError } from '@/lib/ar24-email'
import { FROM_NOTIFS } from '@/lib/email/send'
import { ARReceivedEmail } from '@/lib/email/templates'

export const runtime = 'nodejs'
export const maxDuration = 120
export const dynamic = 'force-dynamic'

interface TrackingClaim { document_id: string; lease_token: string; tracking_number: string; sent_at: string }
interface EmailClaim {
  id: string; lease_token: string; payload: string | null; email: string; user_name: string
  facts: { document_id: string; document_title: string; recipient: string; received_at: string }
}
interface QueueStatus { tracking_due: number; email_due: number; reconciliation: number }
interface ItemResult { id: string; received: boolean; persisted?: boolean; error?: string }

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  try { assertAR24TrackingConfigured() } catch {
    return NextResponse.json({ error: 'Le suivi des recommandés est indisponible.', code: 'ar24_unavailable' }, { status: 503 })
  }

  const budget = createAR24Budget()
  const admin = createServiceClient()
  async function rpc<T>(name: string, args: Record<string, unknown> = {}): Promise<T | null> {
    const result = await budget.run(signal => admin.rpc(name, args).abortSignal(signal))
    if (result.error) throw new Error('queue_unconfirmed')
    return result.data as T | null
  }
  // If the additive migration is absent, fail closed before either provider call.
  try { await rpc('ar24_sync_tracking') } catch {
    return NextResponse.json({ error: 'La file de suivi n’a pas pu être préparée.', code: 'queue_unconfirmed' }, { status: 503 })
  }

  let scanned = 0, updated = 0, emailAttempts = 0, emailed = 0
  let trackingEmpty = false, emailEmpty = false
  const results: ItemResult[] = []
  const notificationResults: Array<{ id: string; accepted: boolean; error?: string }> = []
  let queueError: string | null = null
  // Alternate the two queues: a tracking backlog cannot consume every invocation
  // before a previously persisted receipt gets its email attempt.
  while (budget.remaining() > 0 && ((!trackingEmpty && scanned < 200) || (!emailEmpty && emailAttempts < 200))) {
    try {
      if (!emailEmpty && emailAttempts < 200) {
        const event = await rpc<EmailClaim>('ar24_claim_notification')
        if (!event) emailEmpty = true
        else {
          emailAttempts++
          let providerId: string | null = null
          let reconcile = false
          try {
            assertAR24EmailConfigured()
            let payload = event.payload
            if (!payload) {
              const origin = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://jurispurama.purama.dev').replace(/\/$/, '')
              const html = await budget.run(() => render(ARReceivedEmail({
                userName: event.user_name, documentTitle: event.facts.document_title,
                recipient: event.facts.recipient, receivedAtISO: event.facts.received_at,
                docUrl: `${origin}/documents/${event.facts.document_id}`,
              })))
              payload = JSON.stringify({ from: FROM_NOTIFS, to: [event.email], subject: `Suivi du recommandé — ${event.facts.document_title}`, html })
            }
            const prepared = await rpc<{ payload: string; idempotency_key: string; retry_until: string }>('ar24_begin_notification', {
              p_id: event.id, p_lease_token: event.lease_token, p_payload: payload,
            })
            if (!prepared) throw new AR24EmailError(true)
            // Only this database-returned, frozen payload may leave the process.
            providerId = await budget.run(signal => sendAR24ReceiptEmail(prepared, signal))
          } catch (error) { reconcile = error instanceof AR24EmailError && error.reconcile }
          const confirmed = await rpc<boolean>('ar24_finish_notification', {
            p_id: event.id, p_lease_token: event.lease_token, p_provider_id: providerId, p_reconcile: reconcile,
          }).catch(() => false)
          const accepted = Boolean(providerId && confirmed)
          if (accepted) emailed++
          notificationResults.push({ id: event.id, accepted, ...(!accepted ? { error: 'receipt_notification_unconfirmed' } : {}) })
        }
      }
      if (!trackingEmpty && scanned < 200 && budget.remaining() > 0) {
        const claim = await rpc<TrackingClaim>('ar24_claim_tracking')
        if (!claim) trackingEmpty = true
        else {
          scanned++
          let receivedAt: string | null = null
          let errorCode: string | null = null
          try {
            const status = await budget.run(signal => pollStatus(claim.tracking_number, claim.sent_at, signal), AR24_POLL_LIMIT_MS)
            receivedAt = status.received ? status.received_at ?? null : null
          } catch (error) {
            errorCode = error instanceof AR24BudgetError ? 'status_time_budget_exhausted'
              : error instanceof AR24Error ? error.code : 'status_unconfirmed'
          }
          const saved = await rpc<{ persisted: boolean; rescheduled?: boolean }>('ar24_complete_tracking', {
            p_document_id: claim.document_id, p_lease_token: claim.lease_token, p_received_at: receivedAt, p_error: errorCode,
          }).catch(() => null)
          const result: ItemResult = { id: claim.document_id, received: Boolean(receivedAt) }
          if (receivedAt) {
            result.persisted = saved?.persisted === true
            if (result.persisted) { updated++; emailEmpty = false }
            else result.error = 'receipt_update_unconfirmed'
          } else if (errorCode) result.error = errorCode
          else if (!saved?.rescheduled) result.error = 'tracking_update_unconfirmed'
          results.push(result)
        }
      }
    } catch { queueError = 'queue_unconfirmed'; break }
  }

  const queue = budget.remaining() > 0 ? await rpc<QueueStatus>('ar24_queue_status').catch(() => null) : null
  const failed = results.filter(result => result.error).length + notificationResults.filter(result => result.error).length + (queueError ? 1 : 0)
  // Unknown after a deadline is explicit; the unclaimed or leased remainder is
  // durable in PostgreSQL, rather than guessed from an initial LIMIT 200 snapshot.
  const deferred = queue ? queue.tracking_due + queue.email_due : null
  const ok = failed === 0 && deferred === 0 && queue?.reconciliation === 0 && budget.remaining() > 0
  return NextResponse.json({ ok, job: 'check-ar-status', scanned, updated, notification_attempts: emailAttempts, emailed,
    failed, deferred, queue, queue_error: queueError, remainder_preserved: true,
    budget_exhausted: budget.remaining() <= 0, results, notification_results: notificationResults, timestamp: Date.now(),
  }, { status: ok ? 200 : 503 })
}
