import { Resend } from 'resend'
import type { ReactElement } from 'react'

let cached: Resend | null = null
function getResend(): Resend {
  if (cached) return cached
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error('RESEND_API_KEY manquant')
  cached = new Resend(key)
  return cached
}

export const FROM_DOCUMENTS = 'JurisPurama <documents@purama.dev>'
export const FROM_NOTIFS = 'JurisPurama <notifications@purama.dev>'

export interface SendEmailInput {
  from?: string
  to: string | string[]
  subject: string
  react: ReactElement
  replyTo?: string
  attachments?: Array<{
    filename: string
    content: string // base64
    contentType?: string
  }>
}

export interface SendEmailResult {
  ok: boolean
  id: string | null
  error: string | null
}

export async function sendEmail(
  input: SendEmailInput
): Promise<SendEmailResult> {
  try {
    const resend = getResend()
    const { data, error } = await resend.emails.send({
      from: input.from ?? FROM_DOCUMENTS,
      to: input.to,
      subject: input.subject,
      react: input.react,
      replyTo: input.replyTo,
      attachments: input.attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
        contentType: a.contentType,
      })),
    })
    if (error) {
      return { ok: false, id: null, error: error.message ?? 'Envoi refusé.' }
    }
    return { ok: true, id: data?.id ?? null, error: null }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur inconnue.'
    return { ok: false, id: null, error: msg }
  }
}
