import { createServiceClient } from '@/lib/supabase'
import type { OcrResult } from './types'

export async function injectMessageInCase(
  userId: number,
  caseId: string,
  scanId: string | null,
  result: OcrResult,
  fileName: string,
  signedUrl: string,
  mime: string
): Promise<void> {
  const admin = createServiceClient()

  const { data: caseCheck } = await admin
    .from('jurispurama_cases')
    .select('id, user_id')
    .eq('id', caseId)
    .maybeSingle()

  if (!caseCheck || caseCheck.user_id !== userId) {
    return
  }

  const insightsSummary =
    result.insights.length > 0
      ? result.insights
          .map(
            (i) =>
              `- **${i.severity.toUpperCase()}** : ${i.message}${i.legal_basis ? ` (${i.legal_basis})` : ''}`
          )
          .join('\n')
      : "_Aucun point d'attention majeur détecté._"

  const fieldsSummary = Object.entries(result.extracted_fields)
    .slice(0, 12)
    .map(([k, v]) => `- **${k.replace(/_/g, ' ')}** : ${v ?? '—'}`)
    .join('\n')

  const content = `📄 **Document scanné : ${result.document_type.replace(/_/g, ' ')}**

${result.summary}

**Champs extraits**
${fieldsSummary || '_(aucun)_'}

**Analyse juridique**
${insightsSummary}

_Tu peux me poser toute question sur ce document ou cliquer sur "Générer un document" pour rédiger la réponse adaptée._`

  await admin.from('jurispurama_messages').insert({
    case_id: caseId,
    role: 'assistant',
    content,
    attachments: [
      {
        url: signedUrl,
        type: mime,
        name: fileName,
        scan_id: scanId,
      },
    ],
  })

  if (Array.isArray(result.deadlines) && result.deadlines.length > 0) {
    const { data: existing } = await admin
      .from('jurispurama_cases')
      .select('deadlines')
      .eq('id', caseId)
      .maybeSingle()
    const prev = (existing?.deadlines as typeof result.deadlines) ?? []
    const merged = [
      ...prev,
      ...result.deadlines.map((d) => ({ ...d, notified: false })),
    ]
    await admin
      .from('jurispurama_cases')
      .update({ deadlines: merged, updated_at: new Date().toISOString() })
      .eq('id', caseId)
  }
}
