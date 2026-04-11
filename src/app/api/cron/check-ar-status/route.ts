import { NextResponse, type NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { pollStatus } from '@/lib/ar24'
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

  const admin = createServiceClient()

  const { data: pending } = await admin
    .from('jurispurama_documents')
    .select('id, case_id, title, tracking_number, sent_at, sent_to')
    .eq('sent_status', 'sent_recommande')
    .is('ar_received_at', null)
    .is('deleted_at', null)
    .not('tracking_number', 'is', null)
    .limit(200)

  let updated = 0
  const results: Array<{ id: string; received: boolean }> = []

  for (const d of pending ?? []) {
    if (!d.tracking_number || !d.sent_at) continue
    const status = await pollStatus(d.tracking_number, d.sent_at)
    results.push({ id: d.id, received: status.received })
    if (!status.received || !status.received_at) continue

    await admin
      .from('jurispurama_documents')
      .update({ ar_received_at: status.received_at })
      .eq('id', d.id)

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
      content: `📬 **Accusé de réception reçu**

Ton recommandé "${d.title}" a bien été remis ${
        d.sent_to ? `à ${d.sent_to}` : ''
      } le ${new Date(status.received_at).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })}. La preuve d'AR est archivée dans ton dossier.

[Voir le document](/documents/${d.id})`,
      attachments: null,
    })

    await admin.from('jurispurama_notifications').insert({
      user_id: juriUser.id,
      type: 'ar_received',
      title: 'Accusé de réception',
      message: `"${d.title}" a été remis au destinataire.`,
      link: `/documents/${d.id}`,
    })

    await sendEmail({
      from: FROM_NOTIFS,
      to: juriUser.email,
      subject: `Accusé de réception — ${d.title}`,
      react: ARReceivedEmail({
        userName: juriUser.full_name ?? juriUser.email,
        documentTitle: d.title,
        recipient: d.sent_to ?? 'destinataire',
        receivedAtISO: status.received_at,
        docUrl: `${appUrl()}/documents/${d.id}`,
      }),
    }).catch(() => null)

    updated += 1
  }

  return NextResponse.json({
    ok: true,
    job: 'check-ar-status',
    scanned: pending?.length ?? 0,
    updated,
    results,
    timestamp: Date.now(),
  })
}
