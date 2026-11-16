/** Dedicated durable receipt-email transport. No automatic POST retry here.
 * The outbox supplies the exact persisted body and stable key on each attempt. */
export class AR24EmailError extends Error {
  readonly reconcile: boolean
  constructor(reconcile = false) { super('receipt_email_unconfirmed'); this.name = 'AR24EmailError'; this.reconcile = reconcile }
}

export function assertAR24EmailConfigured() {
  if (!process.env.RESEND_API_KEY?.trim()) throw new AR24EmailError()
}

export async function sendAR24ReceiptEmail(input: {
  payload: string; idempotency_key: string; retry_until: string
}, signal: AbortSignal): Promise<string> {
  assertAR24EmailConfigured()
  signal.throwIfAborted()
  // SQL uses a 23 h window inside Resend's documented 24 h retention. Check
  // again immediately before fetch; never send a queued response after expiry.
  const remaining = Date.parse(input.retry_until) - Date.now()
  if (!Number.isFinite(remaining) || remaining <= 10_000
    || !/^juris-ar24-receipt\/[0-9a-f-]{36}$/i.test(input.idempotency_key)
    || typeof input.payload !== 'string' || Buffer.byteLength(input.payload) > 131072) throw new AR24EmailError(true)
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST', redirect: 'error', cache: 'no-store', signal,
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': input.idempotency_key },
    body: input.payload,
  })
  // Provider errors can contain recipients/body fragments: return only a category.
  const reader = response.body?.getReader()
  if (!reader) throw new AR24EmailError()
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      signal.throwIfAborted()
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > 16_384) throw new AR24EmailError()
      chunks.push(value)
    }
  } finally { void reader.cancel().catch(() => {}); reader.releaseLock() }
  let body: unknown = null
  try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')) } catch { /* unconfirmed */ }
  signal.throwIfAborted()
  if (response.ok && body && typeof body === 'object' && 'id' in body
    && typeof body.id === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(body.id)) return body.id
  const name = body && typeof body === 'object' && 'name' in body ? body.name : null
  throw new AR24EmailError(name === 'invalid_idempotent_request' || name === 'invalid_idempotency_key'
    || response.status === 400 || response.status === 422)
}
