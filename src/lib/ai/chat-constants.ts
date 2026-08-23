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
    .optional(),
})

export const FREE_MONTHLY_LIMIT = 3

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
