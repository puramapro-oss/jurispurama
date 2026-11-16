import { AR24Error } from './ar24-error.ts'
import { ar24Id, type AR24Request } from './ar24-protocol.ts'

/** Must be resolved by a trusted server-side account binding, never from a free-form id_user. */
export interface AR24QualifiedSendInput {
  sender: { id: string; authentication: { otp: string; hash?: never } | { hash: string; otp?: never } }
  recipient: { email: string } & (
    { status: 'particulier'; firstName: string; lastName: string }
    | { status: 'professionnel'; company: string; firstName?: string; lastName?: string }
  )
  documentPdfBuffer: Buffer
  filename: string
  plainText: string
  reference: { documentId: string; caseId: string }
}

const validText = (value: unknown, max: number) => typeof value === 'string'
  && value.length > 0 && value.length <= max && value.trim() === value && !/[\u0000-\u001f\u007f]/.test(value)

export function prepareAR24Send(input: AR24QualifiedSendInput) {
  if (!input || typeof input.sender?.id !== 'string' || !ar24Id(input.sender.id) || !input.sender.authentication
    || !input.recipient || !validText(input.recipient.email, 254)
    || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.recipient.email)
    || !Buffer.isBuffer(input.documentPdfBuffer) || !input.documentPdfBuffer.length
    || input.documentPdfBuffer.length > 20 * 1024 * 1024
    || input.documentPdfBuffer.subarray(0, 5).toString() !== '%PDF-'
    || !validText(input.filename, 200) || !/^[^/\\]+\.pdf$/i.test(input.filename)
    || typeof input.plainText !== 'string' || !input.plainText.trim() || input.plainText.length > 100_000
    || !validText(input.reference?.documentId, 200) || !validText(input.reference?.caseId, 200)) {
    throw new AR24Error('ar24_unavailable')
  }
  const auth = input.sender.authentication
  if ((typeof auth.otp === 'string') === (typeof auth.hash === 'string')
    || (auth.otp !== undefined && !/^\d{1,64}$/.test(auth.otp))
    || (auth.hash !== undefined && !validText(auth.hash, 512))) throw new AR24Error('ar24_unavailable')
  const recipient = input.recipient
  if (recipient.status === 'particulier') {
    if (!validText(recipient.firstName, 200) || !validText(recipient.lastName, 200)) throw new AR24Error('ar24_unavailable')
  } else if (recipient.status === 'professionnel') {
    if (!validText(recipient.company, 200)
      || (recipient.firstName !== undefined && !validText(recipient.firstName, 200))
      || (recipient.lastName !== undefined && !validText(recipient.lastName, 200))) throw new AR24Error('ar24_unavailable')
  } else throw new AR24Error('ar24_unavailable')

  const attachment = new FormData()
  attachment.set('id_user', input.sender.id)
  attachment.set('file', new Blob([new Uint8Array(input.documentPdfBuffer)], { type: 'application/pdf' }), input.filename)
  const mail = new FormData()
  mail.set('id_user', input.sender.id)
  mail.set('eidas', '1')
  mail.set('dest_statut', recipient.status)
  mail.set('to_email', recipient.email)
  if (recipient.firstName) mail.set('to_firstname', recipient.firstName)
  if (recipient.lastName) mail.set('to_lastname', recipient.lastName)
  if (recipient.status === 'professionnel') mail.set('to_company', recipient.company)
  if (auth.otp !== undefined) mail.set('otp', auth.otp)
  else mail.set('auth_otp_hash', auth.hash!)
  // Escape user text so it cannot introduce external HTML resources into an LRE.
  mail.set('content', input.plainText.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!))
  mail.set('ref_dossier', input.reference.caseId)
  mail.set('ref_client', input.reference.documentId)
  return { attachment, mail }
}

/** Unwired candidate: requires an explicit transport and qualified server-side input.
 * The application's send/checkout gate remains closed until identity + durable idempotency exist. */
export async function submitAR24Qualified(input: AR24QualifiedSendInput, request: AR24Request) {
  const { attachment, mail } = prepareAR24Send(input)
  const uploaded = await request('/attachment', 'POST', attachment)
  const attachmentId = ar24Id(uploaded.file_id)
  if (!attachmentId) throw new AR24Error('ar24_unconfirmed')
  mail.set('attachment[0]', attachmentId)
  const result = await request('/mail', 'POST', mail)
  const id = ar24Id(result.id)
  // A SUCCESS envelope can still contain a draft, failure, or non-eIDAS mail.
  if (!id || result.type !== 'lre' || result.is_eidas !== true || result.send_fail !== false
    || typeof result.status !== 'string' || !['sent', 'ev', 'ar', 'AR'].includes(result.status)
    || ar24Id(result.id_sender) !== input.sender.id
    || result.to_email !== input.recipient.email
    || result.dest_statut !== input.recipient.status
    || result.ref_dossier !== input.reference.caseId || result.ref_client !== input.reference.documentId
    || !Array.isArray(result.attachments) || result.attachments.length !== 1
    || ar24Id(result.attachments[0]) !== attachmentId
    || typeof result.price_ht !== 'number' || !Number.isFinite(result.price_ht) || result.price_ht < 0) {
    throw new AR24Error('ar24_unconfirmed')
  }
  // price_ht is provider cost excluding tax, never the app's retail price or an ETA.
  // AR24 may replace first/last names with the identity verified for this email.
  return { tracking_number: id, cost_excluding_tax: result.price_ht, status: result.status }
}
