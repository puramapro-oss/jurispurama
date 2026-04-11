import crypto from 'node:crypto'

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
  mode: 'live' | 'simulated'
  tracking_number: string
  cost: number
  estimated_delivery: string // ISO
  raw: unknown
}

const AR24_BASE =
  process.env.AR24_API_URL ?? 'https://app.ar24.fr/api'
const AR24_KEY = process.env.AR24_API_KEY ?? ''

/**
 * Send a registered letter via AR24 if credentials exist, else fall back to
 * an internal simulation that the rest of the stack treats exactly like a
 * real send (tracking number, AR polling, ar_received_at update).
 */
export async function sendRecommande(
  input: AR24SendInput
): Promise<AR24SendResult> {
  if (AR24_KEY) {
    return sendLive(input)
  }
  return sendSimulated(input)
}

async function sendLive(input: AR24SendInput): Promise<AR24SendResult> {
  const form = new FormData()
  form.append('recipient_name', input.recipient.name)
  form.append('recipient_street', input.recipient.street)
  form.append('recipient_zip', input.recipient.zip)
  form.append('recipient_city', input.recipient.city)
  form.append('recipient_country', input.recipient.country || 'FR')
  if (input.recipient.email) {
    form.append('recipient_email', input.recipient.email)
  }
  form.append('type', 'AR')
  form.append('subject', input.subject)
  form.append(
    'document',
    new Blob([new Uint8Array(input.documentPdfBuffer)], { type: 'application/pdf' }),
    input.filename
  )

  const res = await fetch(`${AR24_BASE}/envois`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${AR24_KEY}` },
    body: form,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(
      `AR24 a refusé l'envoi (HTTP ${res.status}) ${text.slice(0, 200)}`
    )
  }

  const json = (await res.json().catch(() => null)) as {
    tracking_number?: string
    id?: string
    cost?: number
    estimated_delivery?: string
  } | null

  const tracking = json?.tracking_number ?? json?.id ?? `AR24-${Date.now()}`
  return {
    mode: 'live',
    tracking_number: tracking,
    cost: json?.cost ?? 5.99,
    estimated_delivery:
      json?.estimated_delivery ??
      new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString(),
    raw: json,
  }
}

async function sendSimulated(
  input: AR24SendInput
): Promise<AR24SendResult> {
  const random = crypto.randomBytes(6).toString('hex').toUpperCase()
  const tracking = `SIM-AR-${random}`
  // In simulation we consider the delivery happens ~2h later (cron bumps it).
  const estimated = new Date(Date.now() + 1000 * 60 * 60 * 2).toISOString()

  return {
    mode: 'simulated',
    tracking_number: tracking,
    cost: 5.99,
    estimated_delivery: estimated,
    raw: {
      note: 'Mode simulation (AR24_API_KEY non configurée).',
      recipient: input.recipient,
      documentId: input.metadata.documentId,
    },
  }
}

/**
 * Poll the status of a tracking. Returns `received` when AR is complete.
 * In simulation mode, any tracking older than 2h is marked as received.
 */
export async function pollStatus(
  trackingNumber: string,
  sentAtISO: string
): Promise<{ received: boolean; received_at: string | null }> {
  if (trackingNumber.startsWith('SIM-AR-') || !AR24_KEY) {
    const sent = new Date(sentAtISO).getTime()
    const now = Date.now()
    if (now - sent >= 1000 * 60 * 60 * 2) {
      return { received: true, received_at: new Date().toISOString() }
    }
    return { received: false, received_at: null }
  }

  try {
    const res = await fetch(
      `${AR24_BASE}/envois/${encodeURIComponent(trackingNumber)}`,
      {
        headers: { Authorization: `Bearer ${AR24_KEY}` },
      }
    )
    if (!res.ok) return { received: false, received_at: null }
    const json = (await res.json().catch(() => null)) as {
      status?: string
      received_at?: string
    } | null
    if (json?.status === 'received' || json?.received_at) {
      return {
        received: true,
        received_at: json.received_at ?? new Date().toISOString(),
      }
    }
    return { received: false, received_at: null }
  } catch {
    return { received: false, received_at: null }
  }
}

export const AR24_MODE: 'live' | 'simulated' = AR24_KEY ? 'live' : 'simulated'
