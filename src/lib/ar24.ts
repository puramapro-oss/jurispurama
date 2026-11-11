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

export class AR24Error extends Error {
  readonly code: 'ar24_unavailable' | 'ar24_unconfirmed'
  readonly status: 503 | 502

  constructor(code: 'ar24_unavailable' | 'ar24_unconfirmed') {
    super(code === 'ar24_unavailable'
      ? 'Le service de recommandé est indisponible. Aucun dépôt n’a été effectué par cette demande.'
      : 'Le résultat du fournisseur n’a pas pu être confirmé. Vérifie le dépôt auprès du support avant toute nouvelle tentative.')
    this.name = 'AR24Error'
    this.code = code
    this.status = code === 'ar24_unavailable' ? 503 : 502
  }
}

function getConfig() {
  const key = process.env.AR24_API_KEY?.trim()
  if (process.env.AR24_ENABLED !== 'true' || !key) throw new AR24Error('ar24_unavailable')
  let url: URL
  try {
    url = new URL(process.env.AR24_API_URL ?? 'https://app.ar24.fr/api')
  } catch {
    throw new AR24Error('ar24_unavailable')
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
    throw new AR24Error('ar24_unavailable')
  }
  return { key, base: url.toString().replace(/\/$/, '') }
}

export function assertAR24Configured(): void {
  getConfig()
}

function providerReference(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const reference = value.trim()
  if (!reference || reference.length > 200 || /[\u0000-\u001f\u007f]/.test(reference)) return null
  if (/^SIM-AR-/i.test(reference)) return null
  return reference
}

function timestamp(value: unknown): string | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return null
  const time = Date.parse(value)
  return Number.isFinite(time) ? new Date(time).toISOString() : null
}

async function providerRequest(path: string, init: RequestInit): Promise<Record<string, unknown>> {
  const { key, base } = getConfig()
  try {
    const response = await fetch(`${base}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${key}` },
      redirect: 'error',
      signal: AbortSignal.timeout(15_000),
    })
    if (!response.ok) throw new AR24Error('ar24_unconfirmed')
    const json: unknown = await response.json()
    if (!json || typeof json !== 'object' || Array.isArray(json)) {
      throw new AR24Error('ar24_unconfirmed')
    }
    return json as Record<string, unknown>
  } catch {
    // Never expose response bodies, recipient data, URLs or provider credentials.
    // A transport failure is an unknown outcome, not proof that nothing was sent.
    throw new AR24Error('ar24_unconfirmed')
  }
}

/** Only the configured provider can establish a deposit. There is no simulation fallback. */
export async function sendRecommande(input: AR24SendInput): Promise<AR24SendResult> {
  assertAR24Configured()
  const form = new FormData()
  form.append('recipient_name', input.recipient.name)
  form.append('recipient_street', input.recipient.street)
  form.append('recipient_zip', input.recipient.zip)
  form.append('recipient_city', input.recipient.city)
  form.append('recipient_country', input.recipient.country || 'FR')
  if (input.recipient.email) form.append('recipient_email', input.recipient.email)
  form.append('type', 'AR')
  form.append('subject', input.subject)
  form.append('document', new Blob([new Uint8Array(input.documentPdfBuffer)], {
    type: 'application/pdf',
  }), input.filename)

  const json = await providerRequest('/envois', { method: 'POST', body: form })
  const tracking = providerReference(json.tracking_number) ?? providerReference(json.id)
  if (!tracking || typeof json.cost !== 'number' || !Number.isFinite(json.cost) || json.cost < 0) {
    throw new AR24Error('ar24_unconfirmed')
  }
  const estimated = json.estimated_delivery == null ? null : timestamp(json.estimated_delivery)
  if (json.estimated_delivery != null && !estimated) throw new AR24Error('ar24_unconfirmed')

  return {
    mode: 'live',
    tracking_number: tracking,
    cost: json.cost,
    estimated_delivery: estimated,
    raw: json,
  }
}

/** A provider status is not an archived legal receipt. No date is synthesized. */
export async function pollStatus(
  trackingNumber: string,
  sentAtISO: string
): Promise<{ received: boolean; received_at: string | null }> {
  const reference = providerReference(trackingNumber)
  // Historical simulations must never acquire a real receipt by waiting.
  if (!reference) return { received: false, received_at: null }
  const sentAt = timestamp(sentAtISO)
  if (!sentAt) throw new AR24Error('ar24_unconfirmed')
  const json = await providerRequest(`/envois/${encodeURIComponent(reference)}`, { method: 'GET' })
  const matches = [providerReference(json.tracking_number), providerReference(json.id)].includes(reference)
  if (!matches) throw new AR24Error('ar24_unconfirmed')
  if (json.status !== 'received') return { received: false, received_at: null }
  const receivedAt = timestamp(json.received_at)
  if (!receivedAt || Date.parse(receivedAt) < Date.parse(sentAt) || Date.parse(receivedAt) > Date.now()) {
    throw new AR24Error('ar24_unconfirmed')
  }
  return { received: true, received_at: receivedAt }
}

export const AR24_MODE: 'live' | 'unavailable' =
  process.env.AR24_ENABLED === 'true' && process.env.AR24_API_KEY?.trim() ? 'live' : 'unavailable'
