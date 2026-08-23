import { createServiceClient } from '@/lib/supabase'
import type { OcrResult } from './types'

export async function saveScan(
  userId: number,
  caseId: string | null,
  fileName: string,
  storagePath: string,
  mime: string,
  result: OcrResult
): Promise<string | null> {
  const admin = createServiceClient()

  const { data: scanRow } = await admin
    .from('jurispurama_scans')
    .insert({
      user_id: userId,
      case_id: caseId,
      file_name: fileName,
      file_path: storagePath,
      mime_type: mime,
      detected_type: result.document_type,
      extracted_text: result.extracted_text,
      extracted_fields: result.extracted_fields,
      insights: result.insights,
      recommended_actions: result.recommended_actions,
    })
    .select('id')
    .maybeSingle()

  return scanRow?.id ?? null
}
