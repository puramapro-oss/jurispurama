import { AR24Error } from './ar24-error.ts'
import { ar24Config, ar24Id, ar24Timestamp, requestAR24 } from './ar24-protocol.ts'
export { AR24Error } from './ar24-error.ts'

export interface AR24Recipient {
  name: string
  email?: string | null
  street: string
  zip: string
  city: string
  country: string
}

export interface AR24SendInput {
  recipient: AR24Recipient
  documentPdfBuffer: Buffer
  filename: string
  subject: string
  metadata: {
    documentId: string
    caseId: string
    userId: string
    senderName: string
  }
}

export interface AR24SendResult {
  mode: 'live'
  tracking_number: string
  cost: number
  estimated_delivery: string | null
  raw: unknown
}

// No sender binding, recipient consent or durable send reservation is qualified yet.
// Keep the application API compatible, but do not let credentials alone enable sending.
export function assertAR24Configured(): never {
  throw new AR24Error('ar24_unavailable')
}

export function assertAR24TrackingConfigured(): void {
  ar24Config()
}

export async function sendRecommande(_input: AR24SendInput): Promise<AR24SendResult> {
  return assertAR24Configured()
}

/** A provider status is not an archived legal receipt. No date is synthesized. */
export async function pollStatus(
  trackingNumber: string,
  sentAtISO: string
): Promise<{ received: boolean; received_at: string | null }> {
  if (typeof trackingNumber === 'string' && /^SIM-AR-/i.test(trackingNumber.trim())) {
    return { received: false, received_at: null }
  }
  const reference = ar24Id(trackingNumber)
  const sentAt = typeof sentAtISO === 'string' && /^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(sentAtISO)
    ? Date.parse(sentAtISO) : NaN
  if (!reference || !Number.isFinite(sentAt)) throw new AR24Error('ar24_unconfirmed')
  const fields = new FormData()
  fields.set('id', reference)
  const result = await requestAR24('/mail', 'GET', fields)
  if (ar24Id(result.id) !== reference || result.type !== 'lre' || typeof result.status !== 'string') {
    throw new AR24Error('ar24_unconfirmed')
  }
  if (!['ar', 'AR'].includes(result.status)) return { received: false, received_at: null }
  const receivedAt = ar24Timestamp(result.view_date)
  if (result.send_fail !== false || !receivedAt || Date.parse(receivedAt) < sentAt || Date.parse(receivedAt) > Date.now()) {
    throw new AR24Error('ar24_unconfirmed')
  }
  return { received: true, received_at: receivedAt }
}

export const AR24_MODE = 'unavailable' as const
