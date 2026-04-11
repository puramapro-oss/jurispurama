import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { sendEmail, FROM_NOTIFS } from '@/lib/email/send'
import {
  WelcomeEmail,
  Day1TipEmail,
  Day7UpgradeEmail,
  WinbackEmail,
} from '@/lib/email/marketing'
import { APP_DOMAIN } from '@/lib/constants'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

function authorize(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return true // dev mode — allow
  const auth = request.headers.get('authorization') ?? ''
  return auth === `Bearer ${secret}`
}

interface UserRow {
  id: string
  email: string
  full_name: string | null
  created_at: string
}

const BASE_URL = `https://${APP_DOMAIN}`

async function alreadySent(
  admin: ReturnType<typeof createServiceClient>,
  userId: string,
  type: string
): Promise<boolean> {
  const { data } = await admin
    .from('jurispurama_email_sequences')
    .select('id')
    .eq('user_id', userId)
    .eq('email_type', type)
    .maybeSingle()
  return Boolean(data)
}

async function markSent(
  admin: ReturnType<typeof createServiceClient>,
  userId: string,
  type: string
): Promise<void> {
  await admin.from('jurispurama_email_sequences').insert({
    user_id: userId,
    email_type: type,
  })
}

function daysSince(dateIso: string): number {
  const then = new Date(dateIso).getTime()
  const now = Date.now()
  return Math.floor((now - then) / (1000 * 60 * 60 * 24))
}

export async function GET(request: Request): Promise<Response> {
  if (!authorize(request)) {
    return NextResponse.json(
      { ok: false, error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const admin = createServiceClient()
  let welcome = 0
  let tip = 0
  let upgrade = 0
  let winback = 0
  let errors = 0

  try {
    const { data: users } = await admin
      .from('jurispurama_users')
      .select('id, email, full_name, created_at')
      .order('created_at', { ascending: false })
      .limit(500)

    if (!users || users.length === 0) {
      return NextResponse.json({ ok: true, welcome, tip, upgrade, winback })
    }

    for (const raw of users as UserRow[]) {
      if (!raw.email) continue
      const name = raw.full_name ?? raw.email.split('@')[0] ?? 'toi'
      const age = daysSince(raw.created_at)

      try {
        // D0 welcome
        if (age >= 0 && age <= 1 && !(await alreadySent(admin, raw.id, 'welcome'))) {
          const res = await sendEmail({
            from: FROM_NOTIFS,
            to: raw.email,
            subject: 'Bienvenue sur JurisPurama — ton avocat IA est prêt',
            react: (
              <WelcomeEmail
                userName={name}
                dashboardUrl={`${BASE_URL}/dashboard`}
              />
            ),
          })
          if (res.ok) {
            welcome++
            await markSent(admin, raw.id, 'welcome')
          } else {
            errors++
          }
        }

        // D1 tip
        if (age === 1 && !(await alreadySent(admin, raw.id, 'day1_tip'))) {
          const res = await sendEmail({
            from: FROM_NOTIFS,
            to: raw.email,
            subject: '💡 L\'astuce du jour — contester une amende',
            react: (
              <Day1TipEmail
                userName={name}
                dashboardUrl={`${BASE_URL}/dashboard`}
              />
            ),
          })
          if (res.ok) {
            tip++
            await markSent(admin, raw.id, 'day1_tip')
          } else {
            errors++
          }
        }

        // D7 upgrade
        if (age === 7 && !(await alreadySent(admin, raw.id, 'day7_upgrade'))) {
          const res = await sendEmail({
            from: FROM_NOTIFS,
            to: raw.email,
            subject: '🎁 -20 % sur ton premier mois (code WELCOME20)',
            react: (
              <Day7UpgradeEmail
                userName={name}
                upgradeUrl={`${BASE_URL}/abonnement?promo=WELCOME20`}
              />
            ),
          })
          if (res.ok) {
            upgrade++
            await markSent(admin, raw.id, 'day7_upgrade')
          } else {
            errors++
          }
        }

        // D30 winback
        if (age === 30 && !(await alreadySent(admin, raw.id, 'day30_winback'))) {
          const res = await sendEmail({
            from: FROM_NOTIFS,
            to: raw.email,
            subject: 'Tu nous as manqué — reprends un dossier en 3 minutes',
            react: (
              <WinbackEmail
                userName={name}
                dashboardUrl={`${BASE_URL}/dashboard`}
              />
            ),
          })
          if (res.ok) {
            winback++
            await markSent(admin, raw.id, 'day30_winback')
          } else {
            errors++
          }
        }
      } catch {
        errors++
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur inconnue'
    return NextResponse.json(
      { ok: false, error: msg },
      { status: 500 }
    )
  }

  return NextResponse.json({
    ok: true,
    welcome,
    tip,
    upgrade,
    winback,
    errors,
  })
}
