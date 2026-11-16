import { createCipheriv, createHash } from 'node:crypto'

// Synthetic values only. fetch is always replaced before this response is used.
export const token = 'test-token-never-real'
export const privateKey = 'test-private-key-never-real'
export const configured = { AR24_ENABLED: 'true', AR24_API_KEY: token,
  AR24_PRIVATE_KEY: privateKey, AR24_API_URL: 'https://sandbox.ar24.fr/api' }
export function encryptedResponse(result, url, init, status = 'SUCCESS') {
  const date = init.method === 'GET' ? new URL(url).searchParams.get('date') : init.body.get('date')
  const hash = value => createHash('sha256').update(value).digest('hex')
  const key = Buffer.from(hash(date + privateKey).slice(0, 32))
  const iv = Buffer.from(hash(hash(privateKey)).slice(0, 16))
  const cipher = createCipheriv('aes-256-cbc', key, iv)
  return new Response(Buffer.concat([cipher.update(JSON.stringify({ status, result })), cipher.final()]).toString('base64'))
}
export const qualifiedInput = () => ({
  sender: { id: '901', authentication: { otp: '123456' } },
  recipient: { status: 'particulier', firstName: 'Synthetic', lastName: 'Recipient', email: 'recipient@example.invalid' },
  documentPdfBuffer: Buffer.from('%PDF-synthetic-test-only'), filename: 'test.pdf', plainText: 'Synthetic <text>',
  reference: { documentId: 'document-synthetic', caseId: 'case-synthetic' },
})
export const acceptedDeposit = () => ({ id: 123, type: 'lre', status: 'sent', is_eidas: true,
  send_fail: false, id_sender: 901, to_email: 'recipient@example.invalid',
  ref_dossier: 'case-synthetic', ref_client: 'document-synthetic', attachments: [5490], price_ht: 0 })
