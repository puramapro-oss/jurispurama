import { NextResponse, type NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { Resend } from 'resend'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * CRON quotidien 8h — détecte franchissements paliers fiscaux (1500, 2500, 3000€)
 * par utilisateur. 1 notification/palier (UNIQUE contrainte DB).
 *
 * Authentification : header Authorization: Bearer ${CRON_SECRET}
 * ou query ?secret=... côté Vercel Cron.
 */

const PALIERS = [
  {
    amount: 1500,
    subject: 'Information fiscale Purama',
    preheader: 'Tu as franchi 1 500€ de gains cette année.',
    body: (g: number) =>
      `Ton total de gains Purama depuis le 1er janvier a dépassé 1 500€ (total : ${g.toFixed(2)}€).\n\nAucune action n'est requise pour le moment. Le seuil de déclaration est à 3 000€. On t'enverra un rappel bien avant.`,
  },
  {
    amount: 2500,
    subject: 'Bientôt le seuil déclaratif (2 500€ atteints)',
    preheader: "Plus que 500€ avant d'entrer dans l'obligation déclarative.",
    body: (g: number) =>
      `Ton total de gains Purama a franchi 2 500€ (total : ${g.toFixed(2)}€).\n\nÀ 3 000€, tu devras déclarer ces gains dans ta déclaration de revenus (case 5NG). Rendez-vous sur impots.gouv.fr le moment venu.\n\nRécapitulatif complet envoyé en janvier.`,
  },
  {
    amount: 3000,
    subject: '🟡 Seuil fiscal atteint — Action à prévoir',
    preheader: 'Tu dois déclarer. Purama te fournit le récapitulatif.',
    body: (g: number) =>
      `Tu as dépassé le seuil déclaratif de 3 000€ (total : ${g.toFixed(2)}€).\n\nCe que tu dois faire :\n1. Aller sur impots.gouv.fr, espace particulier\n2. Remplir la case 5NG (BNC plateformes numériques)\n3. Indiquer le montant du récapitulatif Purama\n\nAbattement automatique de 34% (tu n'es imposé que sur 66% du montant).\n\nOn t'envoie le récapitulatif détaillé au 1er janvier, rien à préparer d'ici là.`,
  },
]

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const secret = req.nextUrl.searchParams.get('secret')
  const expected = process.env.CRON_SECRET

  const ok =
    (authHeader && authHeader === `Bearer ${expected}`) ||
    (secret && secret === expected) ||
    // Vercel Cron includes a trusted header
    req.headers.get('x-vercel-cron') === '1'

  if (!ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sb = createServiceClient()
  const resendKey = process.env.RESEND_API_KEY
  const resend = resendKey ? new Resend(resendKey) : null
  const year = new Date().getFullYear()

  const { data: users } = await sb
    .from('jurispurama_users')
    .select('id, email, full_name')
  if (!users) return NextResponse.json({ ok: true, processed: 0 })

  let notified = 0
  for (const user of users) {
    const { data: txs } = await sb
      .from('jurispurama_wallet_transactions')
      .select('amount')
      .eq('user_id', user.id)
      .eq('type', 'credit')
      .gte('created_at', `${year}-01-01`)
      .lt('created_at', `${year + 1}-01-01`)

    const total = (txs ?? []).reduce((acc, t) => acc + Number(t.amount ?? 0), 0)

    for (const palier of PALIERS) {
      if (total >= palier.amount) {
        const { data: existing } = await sb
          .from('jurispurama_fiscal_notifications')
          .select('id')
          .eq('user_id', user.id)
          .eq('palier', palier.amount)
          .maybeSingle()
        if (existing) continue

        // Push in-app
        await sb.from('jurispurama_notifications').insert({
          user_id: user.id,
          type: 'fiscal_threshold',
          title: palier.subject,
          message: palier.body(total).split('\n\n')[0],
          link: '/fiscal',
        })

        // Email Resend
        let emailSent = false
        if (resend && user.email) {
          try {
            await resend.emails.send({
              from: 'Purama Fiscal <fiscal@purama.dev>',
              to: user.email,
              subject: palier.subject,
              text: `Bonjour ${user.full_name ?? ''},\n\n${palier.body(total)}\n\nTon espace fiscal : https://jurispurama.purama.dev/fiscal\n\nPurama`,
            })
            emailSent = true
          } catch {
            // non-bloquant
          }
        }

        await sb.from('jurispurama_fiscal_notifications').insert({
          user_id: user.id,
          palier: palier.amount,
          email_sent: emailSent,
          push_sent: true,
        })
        notified++
      }
    }
  }

  return NextResponse.json({ ok: true, processed: users.length, notified })
}
