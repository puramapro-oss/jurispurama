import { createCipheriv, createDecipheriv, createHash } from 'node:crypto'
import { AR24Error } from './ar24-error.ts'

const hash = (value: string) => createHash('sha256').update(value, 'utf8').digest('hex')
const ivFor = (secret: string) => Buffer.from(hash(hash(secret)).slice(0, 16), 'ascii')
const keyFor = (value: string) => Buffer.from(hash(value).slice(0, 32), 'ascii')
const france = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
})

export function ar24Date(date: Date): string {
  return france.format(date)
}

/** A timezone-free AR24 date is French local time. Reject DST gaps and folds. */
export function ar24Timestamp(value: unknown): string | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)) return null
  const naive = Date.parse(value.replace(' ', 'T') + 'Z')
  if (!Number.isFinite(naive)) return null
  const candidates = [1, 2].map(hours => new Date(naive - hours * 3_600_000))
    .filter(date => ar24Date(date) === value)
  return candidates.length === 1 ? candidates[0].toISOString() : null
}

export function ar24Id(value: unknown): string | null {
  const text = typeof value === 'number' && Number.isSafeInteger(value) ? String(value) : value
  return typeof text === 'string' && /^[1-9]\d{0,14}$/.test(text) ? text : null
}

export function ar24Signature(date: string, privateKey: string): string {
  const cipher = createCipheriv('aes-256-cbc', keyFor(privateKey), ivFor(privateKey))
  return Buffer.concat([cipher.update(date, 'utf8'), cipher.final()]).toString('base64')
}

export function decryptAR24Payload(body: string, date: string, privateKey: string): string {
  // Errors are plaintext; successful responses must use the documented encryption.
  // Canonical base64 and a small bound avoid interpreting arbitrary HTML/JSON as ciphertext.
  try {
    if (!body || body.length > 1_048_576 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(body)) throw new Error()
    const encrypted = Buffer.from(body, 'base64')
    if (!encrypted.length || encrypted.length % 16 || encrypted.toString('base64') !== body) throw new Error()
    const cipher = createDecipheriv('aes-256-cbc', keyFor(date + privateKey), ivFor(privateKey))
    return Buffer.concat([cipher.update(encrypted), cipher.final()]).toString('utf8')
  } catch {
    throw new AR24Error('ar24_unconfirmed')
  }
}

export function ar24Config() {
  const token = process.env.AR24_API_KEY?.trim()
  const privateKey = process.env.AR24_PRIVATE_KEY?.trim()
  if (process.env.AR24_ENABLED !== 'true' || !token || !privateKey) throw new AR24Error('ar24_unavailable')
  let base: URL
  try { base = new URL(process.env.AR24_API_URL ?? 'https://app.ar24.fr/api') }
  catch { throw new AR24Error('ar24_unavailable') }
  if (!['https://app.ar24.fr', 'https://sandbox.ar24.fr'].includes(base.origin)
    || !['/api', '/api/'].includes(base.pathname) || base.username || base.password || base.search || base.hash) {
    throw new AR24Error('ar24_unavailable')
  }
  return { token, privateKey, base: base.toString().replace(/\/$/, '') }
}

export type AR24Request = (path: '/mail' | '/attachment', method: 'GET' | 'POST', fields: FormData) => Promise<Record<string, unknown>>

/** Official form-data protocol. No retries: a failed POST may still have taken effect. */
export const requestAR24: AR24Request = async (path, method, fields) => {
  const config = ar24Config()
  // Provider requires a date between receipt and +10 minutes. Allow network/clock drift.
  const date = ar24Date(new Date(Date.now() + 60_000))
  const form = new FormData()
  for (const [key, value] of fields) form.append(key, value)
  form.set('token', config.token)
  form.set('date', date)
  const url = new URL(config.base + path)
  if (method === 'GET') {
    for (const [key, value] of form) {
      if (typeof value !== 'string') throw new AR24Error('ar24_unavailable')
      url.searchParams.set(key, value)
    }
  }
  try {
    const response = await fetch(url.toString(), {
      method, body: method === 'POST' ? form : undefined,
      headers: { signature: ar24Signature(date, config.privateKey) },
      redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(60_000),
    })
    if (response.status !== 200) throw new Error()
    // Cap while reading as well as after decryption; never expose provider bodies or URLs.
    const reader = response.body?.getReader()
    if (!reader) throw new Error()
    const chunks: Uint8Array[] = []
    let size = 0
    try {
      while (true) {
        const chunk = await reader.read()
        if (chunk.done) break
        size += chunk.value.byteLength
        if (size > 1_048_576) { await reader.cancel(); throw new Error() }
        chunks.push(chunk.value)
      }
    } finally { reader.releaseLock() }
    const json = JSON.parse(decryptAR24Payload(Buffer.concat(chunks).toString('utf8').trim(), date, config.privateKey))
    if (!json || typeof json !== 'object' || Array.isArray(json)
      || json.status !== 'SUCCESS' || !json.result || typeof json.result !== 'object' || Array.isArray(json.result)) throw new Error()
    return json.result as Record<string, unknown>
  } catch {
    throw new AR24Error('ar24_unconfirmed')
  }
}
