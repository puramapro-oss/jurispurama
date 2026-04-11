import { NextResponse } from 'next/server'
import { z } from 'zod'
import { Resend } from 'resend'
import { createServiceClient } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ContactSchema = z.object({
  name: z.string().trim().min(2, 'Nom trop court.').max(120),
  email: z.string().trim().email('Email invalide.'),
  category: z.enum([
    'general',
    'commercial',
    'bug',
    'legal',
    'presse',
    'rgpd',
  ]),
  subject: z.string().trim().min(3, 'Sujet trop court.').max(200),
  message: z.string().trim().min(10, 'Message trop court.').max(5000),
})

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json().catch(() => ({}))
    const parsed = ContactSchema.safeParse(body)
    if (!parsed.success) {
      const first = parsed.error.issues[0]
      return NextResponse.json(
        {
          ok: false,
          error: first?.message ?? 'Formulaire invalide.',
        },
        { status: 400 }
      )
    }
    const { name, email, category, subject, message } = parsed.data

    // Persist to DB — best effort. Table may or may not exist.
    try {
      const admin = createServiceClient()
      await admin.from('jurispurama_contact_messages').insert({
        app_slug: 'jurispurama',
        name,
        email,
        category,
        subject,
        message,
      })
    } catch {
      // Silent — email send is the important part.
    }

    // Send email via Resend
    const key = process.env.RESEND_API_KEY
    if (key) {
      const resend = new Resend(key)
      const htmlMessage = message
        .split('\n')
        .map((l) => `<p style="margin:0 0 12px 0;">${escapeHtml(l)}</p>`)
        .join('')

      await resend.emails.send({
        from: 'JurisPurama Contact <contact@purama.dev>',
        to: ['contact@purama.dev', 'purama.pro@gmail.com'],
        replyTo: email,
        subject: `[${categoryLabel(category)}] ${subject}`,
        html: `
<div style="font-family:-apple-system,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f6f4ee;color:#0F172A;">
  <div style="background:linear-gradient(135deg,#1E3A5F,#2A5384);color:white;padding:18px 22px;border-radius:14px 14px 0 0;">
    <h1 style="margin:0;font-family:Georgia,serif;font-size:20px;">⚖ JurisPurama · Nouveau contact</h1>
  </div>
  <div style="background:white;padding:22px;border:1px solid rgba(30,58,95,0.1);border-top:0;border-radius:0 0 14px 14px;">
    <table style="width:100%;font-size:14px;border-collapse:collapse;">
      <tr><td style="padding:6px 0;color:#64748B;width:100px;">Nom</td><td style="padding:6px 0;font-weight:600;">${escapeHtml(name)}</td></tr>
      <tr><td style="padding:6px 0;color:#64748B;">Email</td><td style="padding:6px 0;"><a href="mailto:${escapeHtml(email)}" style="color:#1E3A5F;">${escapeHtml(email)}</a></td></tr>
      <tr><td style="padding:6px 0;color:#64748B;">Catégorie</td><td style="padding:6px 0;">${escapeHtml(categoryLabel(category))}</td></tr>
      <tr><td style="padding:6px 0;color:#64748B;">Sujet</td><td style="padding:6px 0;font-weight:600;">${escapeHtml(subject)}</td></tr>
    </table>
    <hr style="border:0;border-top:1px solid rgba(30,58,95,0.1);margin:16px 0;" />
    <div style="font-size:14px;line-height:1.65;color:#2C3E50;">${htmlMessage}</div>
  </div>
  <p style="font-size:11px;color:#94A3B8;text-align:center;margin-top:16px;">
    Ce message a été envoyé depuis le formulaire de contact de jurispurama.purama.dev.
    Pour répondre, utilise simplement le bouton « Répondre » — le destinataire sera automatiquement ${escapeHtml(email)}.
  </p>
</div>`,
      })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur serveur'
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function categoryLabel(c: string): string {
  const map: Record<string, string> = {
    general: 'Question générale',
    commercial: 'Commercial',
    bug: 'Bug',
    legal: 'Juridique',
    presse: 'Presse',
    rgpd: 'RGPD',
  }
  return map[c] ?? c
}
