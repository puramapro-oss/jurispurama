import { MAX_SIZE, ALLOWED_MIMES } from './constants'

interface ParsedFile {
  file: File
  caseId: string | null
  context: string | null
  mime: string
  buffer: Buffer
  base64: string
}

export async function parseFileFromRequest(
  form: FormData
): Promise<{ success: true; data: ParsedFile } | { success: false; error: string; status: number }> {
  const file = form.get('file')
  const caseIdRaw = form.get('caseId')
  const contextRaw = form.get('context')
  const caseId =
    typeof caseIdRaw === 'string' && caseIdRaw.length > 0 ? caseIdRaw : null
  const context =
    typeof contextRaw === 'string' && contextRaw.length > 0 ? contextRaw : null

  if (!(file instanceof File)) {
    return {
      success: false,
      error: 'Aucun fichier reçu. Joins une image ou un PDF.',
      status: 400,
    }
  }

  if (file.size === 0) {
    return { success: false, error: 'Fichier vide.', status: 400 }
  }

  if (file.size > MAX_SIZE) {
    return {
      success: false,
      error: `Fichier trop volumineux (${(file.size / 1024 / 1024).toFixed(1)} Mo). Maximum : 10 Mo.`,
      status: 413,
    }
  }

  const mime = file.type || 'application/octet-stream'
  if (!ALLOWED_MIMES.has(mime)) {
    return {
      success: false,
      error:
        'Format non supporté. Utilise JPEG, PNG, WEBP, GIF ou PDF (max 10 Mo).',
      status: 415,
    }
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const base64 = buffer.toString('base64')

  return {
    success: true,
    data: { file, caseId, context, mime, buffer, base64 },
  }
}
