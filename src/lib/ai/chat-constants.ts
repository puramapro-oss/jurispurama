import { z } from 'zod'
import type { CaseStatus, CaseType } from '@/types'

export const bodySchema = z.object({
  caseId: z.string().uuid().optional(),
  message: z.string().min(1).max(8000),
  attachments: z
    .array(
      z.object({
        url: z.string().optional(),
        data: z.string().optional(),
        media_type: z
          .enum(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
          .optional(),
        type: z.string().optional(),
        name: z.string().optional(),
      })
    )
    .max(10)
    .optional(),
})

export const FREE_MONTHLY_LIMIT = 3
export const CHAT_RESPONSE_DEADLINE_MS = 110_000

// Metadata begins an internal suffix, including when the provider truncates it.
// Keep indices in the original string: lowercasing all Unicode can change length.
export function publicChatText(fullText: string) {
  const metadataStart = fullText.search(/<juris-meta>/i)
  if (metadataStart !== -1) return fullText.slice(0, metadataStart)
  const lastOpen = fullText.lastIndexOf('<')
  const tail = fullText.slice(lastOpen)
  if (lastOpen !== -1 && tail.length > 1 && '<juris-meta>'.startsWith(tail.toLowerCase())) {
    return fullText.slice(0, lastOpen)
  }
  return fullText
}

// Only these application-owned messages may be exposed by the streaming route.
export class ChatPersistenceError extends Error {
  constructor(kind: 'assistant' | 'case') {
    super(kind === 'assistant'
      ? 'La réponse n’a pas pu être enregistrée. Recharge le dossier avant une nouvelle demande'
      : 'La réponse est enregistrée, mais la mise à jour du dossier n’a pas été confirmée. Recharge le dossier')
    this.name = 'ChatPersistenceError'
  }
}

export const VALID_CASE_TYPES: CaseType[] = [
  'amende',
  'travail',
  'logement',
  'consommation',
  'famille',
  'administratif',
  'fiscal',
  'penal',
  'sante',
  'assurance',
  'numerique',
  'affaires',
]

export const VALID_STATUSES: CaseStatus[] = [
  'diagnostic',
  'analyse',
  'document_pret',
  'signe',
  'envoye',
  'en_attente',
  'resolu',
]

export function sseEncode(obj: unknown): string {
  return `data: ${JSON.stringify(obj)}\n\n`
}
