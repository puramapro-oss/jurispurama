import { test, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { sendRecommande, pollStatus, assertAR24Configured, AR24_MODE } from '../src/lib/ar24.ts'
import { ar24Date, ar24Timestamp, ar24Signature, decryptAR24Payload } from '../src/lib/ar24-protocol.ts'
import { configured, encryptedResponse } from './ar24-fixtures.mjs'

const previous = Object.fromEntries(Object.keys(configured).map(key => [key, process.env[key]]))
const originalFetch = globalThis.fetch
const sentAt = '2026-01-15T10:00:00.000Z'
const receivedAt = '2026-01-15T12:00:00.000Z'
const receipt = () => ({ id: 123, type: 'lre', status: 'ar', send_fail: false, view_date: '2026-01-15 13:00:00' })
let requests
beforeEach(() => {
  Object.assign(process.env, configured)
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
function provider(result, status = 'SUCCESS') {
  globalThis.fetch = async (...args) => { requests.push(args); return encryptedResponse(result, ...args, status) }
}
const unconfirmed = error => error.code === 'ar24_unconfirmed' && error.status === 502
const unavailable = error => error.code === 'ar24_unavailable' && error.status === 503

test('official public PHP encryption vectors agree byte for byte', () => {
  const date = '2021-05-26 14:00:00', key = '7X9gx9E3Qx4EiUdB63nc'
  assert.equal(ar24Signature(date, key), 'bDop0cbjKpkySlpvnNGvBMg7PuYFFgPPqTTS2RAHoY0=')
  // The documentation vector is JavaScript-like text, not valid JSON; transport still requires JSON.
  assert.equal(decryptAR24Payload('WwBOU6s8DaMWmYdctBJwfuoujFgVygBUjhsbdf8eWqQ=', date, key), '{status: "SUCCESS"}')
})
test('French dates follow summer/winter time and reject ambiguous or impossible dates', () => {
  assert.equal(ar24Date(new Date('2026-01-15T12:00:00Z')), '2026-01-15 13:00:00')
  assert.equal(ar24Date(new Date('2026-07-15T12:00:00Z')), '2026-07-15 14:00:00')
  assert.equal(ar24Timestamp('2026-07-15 14:00:00'), '2026-07-15T12:00:00.000Z')
  for (const value of ['2026-03-29 02:30:00', '2026-10-25 02:30:00', '2026-02-30 12:00:00', '2026-01-15 25:00:00', 'tomorrow']) assert.equal(ar24Timestamp(value), null)
})
test('credentials and activation cannot open unqualified sending or checkout', async () => {
  assert.equal(AR24_MODE, 'unavailable')
  assert.throws(() => assertAR24Configured(), unavailable)
  await assert.rejects(sendRecommande({}), unavailable)
  assert.equal(requests.length, 0)
})
test('tracking requires explicit activation plus both distinct credentials', async () => {
  for (const key of ['AR24_ENABLED', 'AR24_API_KEY', 'AR24_PRIVATE_KEY']) {
    delete process.env[key]
    await assert.rejects(pollStatus('123', sentAt), unavailable)
    Object.assign(process.env, configured)
  }
  assert.equal(requests.length, 0)
})
test('untrusted origins, credentials, ports, paths, fragments and queries fail before transport', async () => {
  for (const url of ['http://app.ar24.fr/api', 'https://app.ar24.fr.attacker.invalid/api', 'https://user:secret@app.ar24.fr/api',
    'https://app.ar24.fr:444/api', 'https://app.ar24.fr/api/mail', 'https://app.ar24.fr/api?token=x', 'https://app.ar24.fr/api#x', 'invalid']) {
    process.env.AR24_API_URL = url
    await assert.rejects(pollStatus('123', sentAt), unavailable)
  }
  assert.equal(requests.length, 0)
})
test('simulations never become received and non-provider IDs never reach the network', async () => {
  assert.deepEqual(await pollStatus('SIM-AR-historical', sentAt), { received: false, received_at: null })
  for (const value of ['provider-123', '', '0', '-1', '1.5', '../mail', '123\n']) await assert.rejects(pollStatus(value, sentAt), unconfirmed)
  assert.equal(requests.length, 0)
})
test('a missing or timezone-free local send time cannot establish a receipt', async () => {
  for (const value of ['', 'invalid', '2026-01-15 10:00:00']) await assert.rejects(pollStatus('123', value), unconfirmed)
  assert.equal(requests.length, 0)
})
test('known pending/failure/draft statuses never become received even with a view date', async () => {
  for (const status of ['waiting', 'to_valid', 'sent', 'ev', 'refused', 'negligence', 'bounced', 'fail']) {
    provider({ ...receipt(), status })
    assert.deepEqual(await pollStatus('123', sentAt), { received: false, received_at: null })
  }
})
test('receipt requires matching numeric ID, LRE type, successful sending and plausible view date', async () => {
  for (const patch of [{ id: 124 }, { type: 'paper' }, { send_fail: true }, { send_fail: undefined },
    { status: null }, { view_date: undefined }, { view_date: 'invalid' }, { view_date: '2026-01-15 10:00:00' },
    { view_date: '2099-01-15 13:00:00' }, { view_date: '2026-10-25 02:30:00' }]) {
    provider({ ...receipt(), ...patch })
    await assert.rejects(pollStatus('123', sentAt), unconfirmed)
  }
})
test('confirmed receipt preserves provider time, accepting documented ar/AR spellings', async () => {
  for (const status of ['ar', 'AR']) {
    provider({ ...receipt(), status })
    assert.deepEqual(await pollStatus('123', sentAt), { received: true, received_at: receivedAt })
  }
})
test('request uses signed official GET and disables redirects and caching', async () => {
  provider(receipt())
  await pollStatus('123', sentAt)
  const [url, init] = requests[0]
  assert.equal(new URL(url).pathname, '/api/mail')
  assert.equal(init.redirect, 'error'); assert.equal(init.cache, 'no-store')
  assert.equal(init.headers.Authorization, undefined); assert.ok(init.headers.signature)
  assert.equal(init.body, undefined); assert.equal(requests.length, 1)
})
test('plaintext errors, plaintext success, malformed/encrypted invalid envelopes stay unconfirmed', async () => {
  for (const result of [null, [], 'wrong', 123]) {
    provider(result)
    await assert.rejects(pollStatus('123', sentAt), unconfirmed)
  }
  provider(receipt(), 'ERROR')
  await assert.rejects(pollStatus('123', sentAt), unconfirmed)
  for (const body of ['{"status":"maintenance"}', JSON.stringify({ status: 'SUCCESS', result: receipt() }), 'private html', 'A'.repeat(64)]) {
    globalThis.fetch = async () => new Response(body)
    await assert.rejects(pollStatus('123', sentAt), error => unconfirmed(error) && !/private|maintenance/.test(error.message))
  }
})
test('transport failures are redacted and not retried', async () => {
  await assert.rejects(pollStatus('123', sentAt), unconfirmed)
  assert.equal(requests.length, 1)
  requests = []
  globalThis.fetch = async (...args) => { requests.push(args); return new Response('private token and recipient', { status: 403 }) }
  await assert.rejects(pollStatus('123', sentAt), error => unconfirmed(error) && !/private|token|recipient/.test(error.message))
  assert.equal(requests.length, 1)
})
test('an already-aborted caller cannot start a provider status request', async () => {
  const controller = new AbortController()
  controller.abort()
  await assert.rejects(pollStatus('123', sentAt, controller.signal), unconfirmed)
  assert.deepEqual(requests, [])
})
test('oversized provider responses stop before decryption', async () => {
  globalThis.fetch = async () => new Response('A'.repeat(1_048_577))
  await assert.rejects(pollStatus('123', sentAt), unconfirmed)
})
