import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { Resend } from 'resend'

export const runtime = 'nodejs'

const schema = z.object({
  name: z.string().min(1, 'Nom requis.').max(100),
  email: z.string().email('Email invalide.'),
  message: z.string().min(10, 'Décris ton problème en au moins 10 caractères.').max(5000),
})

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Données invalides.' },
      { status: 400 }
    )
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Service email non configuré.' },
      { status: 500 }
    )
  }

  const resend = new Resend(apiKey)
  const { error } = await resend.emails.send({
    from: 'JurisPurama <noreply@purama.dev>',
    to: 'purama.pro@gmail.com',
    replyTo: parsed.data.email,
    subject: `[Escalade Support] ${parsed.data.name}`,
    text: `Nom: ${parsed.data.name}\nEmail: ${parsed.data.email}\n\n${parsed.data.message}`,
  })

  if (error) {
    return NextResponse.json(
      { error: 'Échec de l\'envoi. Réessaie ou écris à contact@purama.dev.' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}
