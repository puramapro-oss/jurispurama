import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { getAnthropic, FAST_MODEL } from '@/lib/claude'

export const runtime = 'nodejs'

const bodySchema = z.object({
  message: z.string().min(1).max(2000),
  history: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string() }))
    .max(10)
    .optional(),
})

const SYSTEM_PROMPT = `Tu es l'assistant d'aide de JurisPurama, l'assistant juridique IA.
Tu réponds UNIQUEMENT aux questions sur l'utilisation de JurisPurama : fonctionnalités, tarifs, parrainage, compte, facturation, documents, etc.
Tu NE donnes PAS de conseil juridique ici (redirige vers le chat JurisIA pour ça).
Tu tutoies, tu es bienveillant, concis, et tu utilises des emojis.
Si la question est trop complexe ou hors sujet, propose d'écrire à contact@purama.dev.
Réponds en français. Maximum 200 mots.`

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Message invalide.' },
      { status: 400 }
    )
  }

  const messages = [
    ...(parsed.data.history ?? []).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user' as const, content: parsed.data.message },
  ]

  try {
    const anthropic = getAnthropic()
    const response = await anthropic.messages.create({
      model: FAST_MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages,
    })

    const text =
      response.content[0]?.type === 'text' ? response.content[0].text : ''

    return NextResponse.json({ reply: text })
  } catch {
    return NextResponse.json(
      { error: 'Service temporairement indisponible. Réessaie dans quelques instants.' },
      { status: 500 }
    )
  }
}
