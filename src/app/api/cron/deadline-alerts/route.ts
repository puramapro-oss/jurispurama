import { NextResponse, type NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { sendEmail, FROM_NOTIFS } from '@/lib/email/send'
import { DeadlineAlertEmail } from '@/lib/email/templates'

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

interface Deadline {
  date: string
  description: string
  critical?: boolean
  notified?: {
    j7?: boolean
    j3?: boolean
    j1?: boolean
  }
}

function daysUntil(dateStr: string): number {
  const d = new Date(dateStr)
  d.setHours(0, 0, 0, 0)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return Math.round((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const admin = createServiceClient()

  const { data: cases } = await admin
    .from('jurispurama_cases')
    .select('id, user_id, summary, deadlines, status')
    .in('status', ['diagnostic', 'analyse', 'document_pret', 'signe', 'envoye', 'en_attente'])
    .not('deadlines', 'is', null)

  let sent = 0
  let scanned = 0

  for (const c of cases ?? []) {
    const deadlinesRaw = (c.deadlines ?? []) as Deadline[]
    if (!Array.isArray(deadlinesRaw) || deadlinesRaw.length === 0) continue

    let updated = false
    const nextDeadlines: Deadline[] = []

    for (const d of deadlinesRaw) {
      scanned += 1
      const days = daysUntil(d.date)
      const notified = d.notified ?? {}
      let marker: 'j7' | 'j3' | 'j1' | null = null
      if (days <= 1 && days >= 0 && !notified.j1) marker = 'j1'
      else if (days <= 3 && days > 1 && !notified.j3) marker = 'j3'
      else if (days <= 7 && days > 3 && !notified.j7) marker = 'j7'

      if (marker) {
        const { data: juriUser } = await admin
          .from('jurispurama_users')
          .select('id, full_name, email')
          .eq('id', c.user_id)
          .maybeSingle()

        if (juriUser?.email) {
          await admin.from('jurispurama_notifications').insert({
            user_id: juriUser.id,
            type: `deadline_${marker}`,
            title:
              marker === 'j1'
                ? 'Délai imminent'
                : marker === 'j3'
                  ? 'Délai urgent'
                  : 'Délai proche',
            message: `${d.description} — ${
              days <= 0 ? "aujourd'hui" : `dans ${days} jour${days > 1 ? 's' : ''}`
            }`,
            link: `/dossiers/${c.id}`,
          })

          await sendEmail({
            from: FROM_NOTIFS,
            to: juriUser.email,
            subject: `${
              marker === 'j1' ? '🚨' : marker === 'j3' ? '⚠️' : '⏰'
            } Délai ${c.summary ?? 'dossier'}`,
            react: DeadlineAlertEmail({
              userName: juriUser.full_name ?? juriUser.email,
              caseTitle: c.summary ?? 'Dossier',
              deadlineDescription: d.description,
              daysLeft: Math.max(0, days),
              deadlineDate: d.date,
              caseUrl: `${appUrl()}/dossiers/${c.id}`,
            }),
          }).catch(() => null)

          sent += 1
        }

        nextDeadlines.push({
          ...d,
          notified: { ...notified, [marker]: true },
        })
        updated = true
      } else {
        nextDeadlines.push(d)
      }
    }

    if (updated) {
      await admin
        .from('jurispurama_cases')
        .update({ deadlines: nextDeadlines })
        .eq('id', c.id)
    }
  }

  return NextResponse.json({
    ok: true,
    job: 'deadline-alerts',
    scanned,
    sent,
    timestamp: Date.now(),
  })
}
