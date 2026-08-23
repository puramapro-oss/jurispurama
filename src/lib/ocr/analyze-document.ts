import { getAnthropic, DEFAULT_MODEL } from '@/lib/claude'
import { OCR_SYSTEM_PROMPT } from './constants'
import type { OcrResult } from './types'

type ContentBlock =
  | {
      type: 'image'
      source: {
        type: 'base64'
        media_type: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'
        data: string
      }
    }
  | {
      type: 'document'
      source: { type: 'base64'; media_type: 'application/pdf'; data: string }
    }
  | { type: 'text'; text: string }

export async function analyzeDocument(
  base64: string,
  mime: string,
  context: string | null
): Promise<OcrResult> {
  const client = getAnthropic()
  const userPrompt = context
    ? `Analyse ce document. Contexte fourni par l'utilisateur : "${context}". Retourne UNIQUEMENT le JSON demandé.`
    : `Analyse ce document juridique. Retourne UNIQUEMENT le JSON demandé.`

  const contentBlocks: ContentBlock[] = []

  if (mime === 'application/pdf') {
    contentBlocks.push({
      type: 'document',
      source: {
        type: 'base64',
        media_type: 'application/pdf',
        data: base64,
      },
    })
  } else {
    contentBlocks.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: mime as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif',
        data: base64,
      },
    })
  }
  contentBlocks.push({ type: 'text', text: userPrompt })

  const resp = await client.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 8192,
    temperature: 0.1,
    system: OCR_SYSTEM_PROMPT,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    messages: [{ role: 'user', content: contentBlocks as any }],
  })

  const raw = resp.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { type: 'text'; text: string }).text)
    .join('')
    .trim()

  const jsonStr = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim()

  return JSON.parse(jsonStr) as OcrResult
}
