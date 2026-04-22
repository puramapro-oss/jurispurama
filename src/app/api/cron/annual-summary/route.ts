import { NextResponse, type NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { Resend } from 'resend'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

export const runtime = 'nodejs'
export const maxDuration = 120
export const dynamic = 'force-dynamic'

/**
 * Endpoints :
 *  - GET /api/cron/annual-summary?secret=... → CRON 1er janvier (tous users)
 *  - GET /api/cron/annual-summary?year=YYYY&preview=1 → self-service user (auth requise)
 */

interface GainBreakdown {
  total_primes: number
  total_parrainage: number
  total_nature: number
  total_marketplace: number
  total_missions: number
  total_annuel: number
}

async function buildBreakdown(
  userId: string,
  year: number
): Promise<GainBreakdown> {
  const sb = createServiceClient()
  const { data: txs } = await sb
    .from('jurispurama_wallet_transactions')
    .select('amount, source, type, created_at')
    .eq('user_id', userId)
    .eq('type', 'credit')
    .gte('created_at', `${year}-01-01`)
    .lt('created_at', `${year + 1}-01-01`)

  const breakdown: GainBreakdown = {
    total_primes: 0,
    total_parrainage: 0,
    total_nature: 0,
    total_marketplace: 0,
    total_missions: 0,
    total_annuel: 0,
  }
  for (const tx of txs ?? []) {
    const amt = Number(tx.amount ?? 0)
    breakdown.total_annuel += amt
    const src = String(tx.source ?? '')
    if (src.startsWith('prime')) breakdown.total_primes += amt
    else if (src.startsWith('referral')) breakdown.total_parrainage += amt
    else if (src === 'nature') breakdown.total_nature += amt
    else if (src === 'marketplace') breakdown.total_marketplace += amt
    else if (src === 'mission') breakdown.total_missions += amt
  }
  return breakdown
}

async function renderPdf(
  userName: string,
  email: string,
  year: number,
  breakdown: GainBreakdown
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  const page = pdf.addPage([595, 842]) // A4
  const font = await pdf.embedFont(StandardFonts.TimesRoman)
  const fontBold = await pdf.embedFont(StandardFonts.TimesRomanBold)
  const navy = rgb(30 / 255, 58 / 255, 95 / 255)
  const gold = rgb(201 / 255, 168 / 255, 76 / 255)
  const muted = rgb(0.45, 0.45, 0.45)

  // Header
  page.drawText('PURAMA', {
    x: 50,
    y: 790,
    size: 18,
    font: fontBold,
    color: navy,
  })
  page.drawText(`Récapitulatif annuel de gains — ${year}`, {
    x: 50,
    y: 760,
    size: 14,
    font: fontBold,
    color: navy,
  })
  page.drawLine({
    start: { x: 50, y: 745 },
    end: { x: 545, y: 745 },
    thickness: 1,
    color: gold,
  })

  // Identité
  let y = 710
  page.drawText(`Bénéficiaire : ${userName}`, { x: 50, y, size: 11, font })
  y -= 18
  page.drawText(`E-mail : ${email}`, { x: 50, y, size: 11, font })
  y -= 18
  page.drawText(`Période : 01/01/${year} — 31/12/${year}`, { x: 50, y, size: 11, font })
  y -= 40

  // Tableau
  page.drawText('Détail par source', { x: 50, y, size: 13, font: fontBold, color: navy })
  y -= 25

  const rows: [string, number][] = [
    ['Primes de bienvenue (L221-28)', breakdown.total_primes],
    ['Parrainage (commissions 50%/10%)', breakdown.total_parrainage],
    ['Nature Rewards', breakdown.total_nature],
    ['Marketplace', breakdown.total_marketplace],
    ['Missions & concours', breakdown.total_missions],
  ]
  for (const [label, amount] of rows) {
    if (amount === 0) continue
    page.drawText(label, { x: 50, y, size: 11, font })
    page.drawText(
      amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }),
      { x: 400, y, size: 11, font, color: navy }
    )
    y -= 20
  }

  y -= 10
  page.drawLine({
    start: { x: 50, y },
    end: { x: 545, y },
    thickness: 0.5,
    color: muted,
  })
  y -= 20
  page.drawText('TOTAL', { x: 50, y, size: 13, font: fontBold, color: navy })
  page.drawText(
    breakdown.total_annuel.toLocaleString('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }),
    { x: 400, y, size: 13, font: fontBold, color: navy }
  )

  // Mention légale
  y = 200
  page.drawText('Mention légale', { x: 50, y, size: 11, font: fontBold, color: navy })
  y -= 16
  const legal = [
    `Ce document est émis à titre informatif par SASU PURAMA (8 Rue Chapelle, 25560`,
    `Frasne). Les montants ci-dessus constituent des revenus de type BNC (bénéfices`,
    `non commerciaux) issus d'une plateforme numérique.`,
    '',
    `Si le total annuel dépasse 3 000€, tu dois déclarer ces revenus en case 5NG`,
    `de ta déclaration de revenus (impots.gouv.fr). Un abattement forfaitaire de 34%`,
    `s'applique automatiquement (régime micro-BNC).`,
    '',
    `Purama déclare ces sommes à l'administration fiscale via le formulaire DAS2`,
    `pour tout utilisateur dépassant 3 000€ dans l'année.`,
  ]
  for (const line of legal) {
    page.drawText(line, { x: 50, y, size: 9, font, color: muted })
    y -= 12
  }

  // Footer
  page.drawText('SASU PURAMA — SIRET à renseigner — TVA non applicable, art. 293B CGI', {
    x: 50,
    y: 40,
    size: 8,
    font,
    color: muted,
  })
  page.drawText(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, {
    x: 400,
    y: 40,
    size: 8,
    font,
    color: muted,
  })

  return await pdf.save()
}

export async function GET(req: NextRequest) {
  const isPreview = req.nextUrl.searchParams.get('preview') === '1'
  const yearParam = req.nextUrl.searchParams.get('year')
  const year = yearParam ? Number(yearParam) : new Date().getFullYear() - 1

  // --- Mode preview (user self-service) ---
  if (isPreview) {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Auth requise' }, { status: 401 })
    }
    const admin = createServiceClient()
    const { data: profile } = await admin
      .from('jurispurama_users')
      .select('id, full_name, email')
      .eq('auth_user_id', user.id)
      .maybeSingle()
    if (!profile) {
      return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 })
    }
    const breakdown = await buildBreakdown(profile.id, year)
    const pdf = await renderPdf(
      profile.full_name ?? profile.email ?? 'Utilisateur',
      profile.email ?? '',
      year,
      breakdown
    )
    return new NextResponse(Buffer.from(pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="jurispurama-recap-${year}.pdf"`,
      },
    })
  }

  // --- Mode CRON (tous users) ---
  const authHeader = req.headers.get('authorization')
  const secret = req.nextUrl.searchParams.get('secret')
  const expected = process.env.CRON_SECRET
  const ok =
    (authHeader && authHeader === `Bearer ${expected}`) ||
    (secret && secret === expected) ||
    req.headers.get('x-vercel-cron') === '1'
  if (!ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sb = createServiceClient()
  const resendKey = process.env.RESEND_API_KEY
  const resend = resendKey ? new Resend(resendKey) : null

  const { data: users } = await sb
    .from('jurispurama_users')
    .select('id, email, full_name')
  if (!users) return NextResponse.json({ ok: true, processed: 0 })

  let generated = 0
  let emailed = 0
  for (const user of users) {
    const breakdown = await buildBreakdown(user.id, year)
    if (breakdown.total_annuel <= 0) continue

    // Stocker row summary
    await sb.from('jurispurama_annual_summaries').upsert(
      {
        user_id: user.id,
        year,
        ...breakdown,
      },
      { onConflict: 'user_id,year' }
    )

    // Email avec PDF joint
    if (resend && user.email) {
      const pdf = await renderPdf(
        user.full_name ?? user.email,
        user.email,
        year,
        breakdown
      )
      try {
        await resend.emails.send({
          from: 'Purama Fiscal <fiscal@purama.dev>',
          to: user.email,
          subject: `Récapitulatif annuel Purama — ${year}`,
          text: `Bonjour ${user.full_name ?? ''},\n\nVoici ton récapitulatif annuel des gains Purama ${year}.\n\nTotal : ${breakdown.total_annuel.toFixed(2)}€\n\n${breakdown.total_annuel >= 3000 ? 'Tu dois déclarer ces revenus en case 5NG sur impots.gouv.fr.' : 'Tu es en dessous du seuil déclaratif de 3 000€.'}\n\nEn pièce jointe : PDF officiel.\n\nPurama`,
          attachments: [
            {
              filename: `jurispurama-recap-${year}.pdf`,
              content: Buffer.from(pdf).toString('base64'),
            },
          ],
        })
        emailed++
      } catch {
        // non-bloquant
      }
    }
    generated++
  }

  return NextResponse.json({
    ok: true,
    year,
    processed: users.length,
    generated,
    emailed,
  })
}
