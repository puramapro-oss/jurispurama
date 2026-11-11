import { test, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { sendRecommande, pollStatus } from '../src/lib/ar24.ts'

const previous = { AR24_ENABLED: process.env.AR24_ENABLED, AR24_API_KEY: process.env.AR24_API_KEY, AR24_API_URL: process.env.AR24_API_URL }
const originalFetch = globalThis.fetch
const input = {
  recipient: { name: 'Destinataire test', street: '1 rue Test', zip: '75001', city: 'Paris', country: 'FR' },
  documentPdfBuffer: Buffer.from('%PDF-test'), filename: 'test.pdf', subject: 'Test hors réseau',
  metadata: { documentId: 'doc-test', caseId: 'case-test', userId: 'user-test', senderName: 'Test' },
}
const sentAt = new Date(Date.now() - 10800000).toISOString()
const receivedAt = new Date(Date.now() - 3600000).toISOString()
let requests

beforeEach(() => {
  process.env.AR24_ENABLED = 'true'
  process.env.AR24_API_KEY = 'test-key-never-real'
  process.env.AR24_API_URL = 'https://ar24-provider.invalid/api'
  requests = []
  globalThis.fetch = async (...args) => { requests.push(args); throw new Error('Network disabled in tests') }
})
afterEach(() => {
  for (const [env, value] of Object.entries(previous)) {
    if (value === undefined) delete process.env[env]
    else process.env[env] = value
  }
  globalThis.fetch = originalFetch
})
function provider(body, status = 200) {
  globalThis.fetch = async (...args) => {
    requests.push(args)
    return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
  }
}
const unconfirmed = (error) => error.code === 'ar24_unconfirmed' && error.status === 502

test('a key alone cannot activate the unqualified integration', async () => {
  for (const flag of [undefined, 'false', 'TRUE', '1']) {
    if (flag === undefined) delete process.env.AR24_ENABLED
    else process.env.AR24_ENABLED = flag
    await assert.rejects(sendRecommande(input), (error) => error.code === 'ar24_unavailable')
  }
  assert.equal(requests.length, 0)
})
test('missing configuration never produces a simulated deposit', async () => {
  delete process.env.AR24_API_KEY
  await assert.rejects(sendRecommande(input), (error) => error.code === 'ar24_unavailable' && error.status === 503)
  assert.equal(requests.length, 0)
})
test('unsafe or malformed provider configuration is rejected before transport', async () => {
  for (const url of ['http://provider.invalid', 'https://user:secret@provider.invalid', 'https://provider.invalid?key=secret', 'not a URL']) {
    process.env.AR24_API_URL = url
    await assert.rejects(sendRecommande(input), (error) => error.code === 'ar24_unavailable')
  }
  assert.equal(requests.length, 0)
})
test('accepted adapter response preserves reference and cost without fabricating an ETA', async () => {
  provider({ tracking_number: 'provider-123', cost: 0 })
  const result = await sendRecommande(input)
  assert.deepEqual({ mode: result.mode, tracking: result.tracking_number, cost: result.cost, eta: result.estimated_delivery },
    { mode: 'live', tracking: 'provider-123', cost: 0, eta: null })
  assert.equal(requests.length, 1)
  assert.equal(requests[0][1].redirect, 'error')
})
test('missing, blank and simulated references cannot establish a deposit', async () => {
  for (const tracking_number of [undefined, '', ' ', 'SIM-AR-old', 'sim-ar-old', 'ref\ninvalid']) {
    provider({ tracking_number, cost: 5.99 })
    await assert.rejects(sendRecommande(input), unconfirmed)
  }
})
test('unknown costs, invalid dates and malformed objects are not replaced with defaults', async () => {
  for (const body of [{ tracking_number: 'provider-123' }, { tracking_number: 'provider-123', cost: -1 },
    { tracking_number: 'provider-123', cost: '5.99' }, { tracking_number: 'provider-123', cost: 5.99, estimated_delivery: 'tomorrow' }, null, []]) {
    provider(body)
    await assert.rejects(sendRecommande(input), unconfirmed)
  }
})
test('provider error bodies and credentials stay out of errors and are not retried', async () => {
  provider({ detail: 'private recipient, test-key-never-real' }, 403)
  await assert.rejects(sendRecommande(input), (error) => unconfirmed(error) && !/private|test-key/.test(error.message))
  assert.equal(requests.length, 1)
})
test('transport uncertainty and invalid JSON produce an unconfirmed outcome', async () => {
  await assert.rejects(sendRecommande(input), unconfirmed)
  assert.equal(requests.length, 1)
  globalThis.fetch = async () => new Response('private non-JSON body')
  await assert.rejects(sendRecommande(input), (error) => unconfirmed(error) && !/private/.test(error.message))
})
test('historical simulation never becomes received after elapsed time', async () => {
  assert.deepEqual(await pollStatus('SIM-AR-historical', sentAt), { received: false, received_at: null })
  assert.equal(requests.length, 0)
})
test('missing configuration never converts real tracking into simulated receipt', async () => {
  delete process.env.AR24_API_KEY
  await assert.rejects(pollStatus('provider-123', sentAt), (error) => error.code === 'ar24_unavailable')
  assert.equal(requests.length, 0)
})
test('pending provider status remains pending even when a timestamp is present', async () => {
  provider({ tracking_number: 'provider-123', status: 'pending', received_at: receivedAt })
  assert.deepEqual(await pollStatus('provider-123', sentAt), { received: false, received_at: null })
})
test('receipt must match the reference and include a plausible provider timestamp', async () => {
  for (const body of [
    { tracking_number: 'other', status: 'received', received_at: receivedAt },
    { tracking_number: 'provider-123', status: 'received' },
    { tracking_number: 'provider-123', status: 'received', received_at: 'invalid' },
    { tracking_number: 'provider-123', status: 'received', received_at: new Date(Date.now() + 3600000).toISOString() },
    { tracking_number: 'provider-123', status: 'received', received_at: new Date(Date.parse(sentAt) - 1000).toISOString() },
  ]) {
    provider(body)
    await assert.rejects(pollStatus('provider-123', sentAt), unconfirmed)
  }
})
test('matching received response uses only the adapter timestamp', async () => {
  provider({ tracking_number: 'provider-123', status: 'received', received_at: receivedAt })
  assert.deepEqual(await pollStatus('provider-123', sentAt), { received: true, received_at: receivedAt })
})
