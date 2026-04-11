import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from 'node:crypto'

/**
 * AES-256-GCM encryption for at-rest sensitive profile fields (SSN, IBAN,
 * tax number, driver license). Keys derived from SUPABASE_SERVICE_ROLE_KEY
 * via scrypt with a fixed app-level salt. Stored values are prefixed with
 * "v1:" followed by base64(iv || authTag || ciphertext).
 *
 * Rotating the service role key would invalidate all stored ciphertexts —
 * if that happens, add a v2: branch with the new key.
 */

const VERSION = 'v1'
const KEY_SALT = 'jurispurama-legal-profile:v1'
const IV_LENGTH = 12
const KEY_LENGTH = 32

let _key: Buffer | null = null

function deriveKey(): Buffer {
  if (_key) return _key
  const secret = process.env.ENCRYPTION_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret) {
    throw new Error(
      'ENCRYPTION_KEY ou SUPABASE_SERVICE_ROLE_KEY manquant côté serveur — impossible de chiffrer les données sensibles.'
    )
  }
  _key = scryptSync(secret, KEY_SALT, KEY_LENGTH)
  return _key
}

/**
 * Encrypt a plain string. Returns a "v1:base64" string.
 * Returns null / empty unchanged so blank fields stay blank in DB.
 */
export function encryptString(plain: string | null | undefined): string | null {
  if (plain == null || plain === '') return null
  const key = deriveKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const enc = Buffer.concat([
    cipher.update(plain, 'utf8'),
    cipher.final(),
  ])
  const tag = cipher.getAuthTag()
  const combined = Buffer.concat([iv, tag, enc])
  return `${VERSION}:${combined.toString('base64')}`
}

/**
 * Decrypt a previously-encrypted value. If the value is null/empty returns null.
 * If the value is not prefixed with "v1:" it is returned as-is (legacy plain text).
 * Decryption failures return null (data corruption or wrong key).
 */
export function decryptString(stored: string | null | undefined): string | null {
  if (stored == null || stored === '') return null
  if (!stored.startsWith(`${VERSION}:`)) {
    // Legacy or unencrypted value — pass through
    return stored
  }
  try {
    const key = deriveKey()
    const raw = Buffer.from(stored.slice(VERSION.length + 1), 'base64')
    const iv = raw.subarray(0, IV_LENGTH)
    const tag = raw.subarray(IV_LENGTH, IV_LENGTH + 16)
    const enc = raw.subarray(IV_LENGTH + 16)
    const decipher = createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(tag)
    const dec = Buffer.concat([decipher.update(enc), decipher.final()])
    return dec.toString('utf8')
  } catch {
    return null
  }
}

/**
 * Mask a sensitive value for display (keeps last 4 chars).
 * Example: "FR7612345678901234567890123" → "•••••••••0123"
 */
export function maskSensitive(value: string | null | undefined): string {
  if (!value) return ''
  const trimmed = value.replace(/\s/g, '')
  if (trimmed.length <= 4) return '•'.repeat(trimmed.length)
  return `${'•'.repeat(Math.max(4, trimmed.length - 4))}${trimmed.slice(-4)}`
}

/** Check if a stored value appears encrypted (v1:...) */
export function isEncrypted(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.startsWith(`${VERSION}:`)
}
