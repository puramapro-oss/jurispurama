import { createServiceClient } from '@/lib/supabase'
import { BUCKET } from './constants'

export async function uploadFileToStorage(
  buffer: Buffer,
  mime: string,
  fileName: string,
  authUserId: string,
  caseId: string | null
): Promise<{ success: true; storagePath: string; signedUrl: string } | { success: false; error: string }> {
  const admin = createServiceClient()
  const timestamp = Date.now()
  const safeName = fileName
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 80) || 'document'
  const storagePath = `${authUserId}/${caseId ?? 'scans'}/${timestamp}-${safeName}`

  const { error: uploadErr } = await admin.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType: mime,
      upsert: false,
    })

  if (uploadErr) {
    return {
      success: false,
      error: `Impossible d'enregistrer le fichier : ${uploadErr.message}`,
    }
  }

  const { data: signed } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 3600)
  const signedUrl = signed?.signedUrl ?? ''

  return { success: true, storagePath, signedUrl }
}
