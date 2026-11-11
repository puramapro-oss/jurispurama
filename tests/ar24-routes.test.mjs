import { test, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { fixture, request, context, cronRequest } from './ar24-route-harness.mjs'
const { POST } = await import('../src/app/api/documents/[id]/send-recommande/route.ts')
const { GET } = await import('../src/app/api/cron/check-ar-status/route.ts')
const previous = { AR24_ENABLED: process.env.AR24_ENABLED, AR24_API_KEY: process.env.AR24_API_KEY, AR24_API_URL: process.env.AR24_API_URL, CRON_SECRET: process.env.CRON_SECRET }
const originalFetch = globalThis.fetch
let state
beforeEach(() => {
  process.env.AR24_ENABLED = 'true'
  process.env.AR24_API_KEY = 'test-key-never-real'
  process.env.AR24_API_URL = 'https://provider.invalid/api'
  process.env.CRON_SECRET = 'cron-test-not-real'
  state = fixture()
})
afterEach(() => {
  for (const [env, value] of Object.entries(previous)) {
    if (value === undefined) delete process.env[env]
    else process.env[env] = value
  }
  globalThis.fetch = originalFetch
  delete globalThis.__ar24TestState
})
test('send route without activation returns 503 without download, transport or writes', async () => {
  delete process.env.AR24_ENABLED
  const response = await POST(request(), context)
  assert.equal(response.status, 503)
  assert.equal((await response.json()).code, 'ar24_unavailable')
  assert.equal(state.downloads, 0)
  assert.equal(state.requests.length, 0)
  assert.deepEqual(state.writes, [])
  assert.deepEqual(state.emails, [])
})
test('exhausted or unreadable quota never starts a deposit or creates simulated payment', async () => {
  state.count = 3
  assert.equal((await POST(request(), context)).status, 402)
  state.count = null
  state.countError = { message: 'private database error' }
  assert.equal((await POST(request(), context)).status, 503)
  assert.equal(state.requests.length, 0)
  assert.equal(state.downloads, 0)
  assert.deepEqual(state.writes, [])
})
test('existing tracking requires reconciliation instead of another deposit', async () => {
  state.doc.tracking_number = 'SIM-AR-historical'
  const response = await POST(request(), context)
  assert.equal(response.status, 409)
  assert.equal((await response.json()).code, 'reconciliation_required')
  assert.equal(state.requests.length, 0)
})
test('provider failure cannot set sent status or notify success', async () => {
  state.provider = () => new Response('private provider failure', { status: 500 })
  const response = await POST(request(), context)
  assert.equal(response.status, 502)
  assert.doesNotMatch((await response.json()).error, /private/)
  assert.deepEqual(state.writes, [])
  assert.deepEqual(state.emails, [])
})
test('accepted adapter deposit persists the reference before success messages', async () => {
  state.provider = () => {
    assert.deepEqual(state.writes, [])
    return new Response(JSON.stringify({ tracking_number: 'provider-123', cost: 5.99 }))
  }
  const response = await POST(request(), context)
  assert.equal(response.status, 200)
  const body = await response.json()
  assert.equal(body.mode, 'live')
  assert.equal(body.tracking_number, 'provider-123')
  assert.equal(state.writes[0].table, 'jurispurama_documents')
  assert.equal(state.writes[0].payload.sent_status, 'sent_recommande')
  assert.equal(state.writes[0].payload.tracking_number, 'provider-123')
  assert.equal(state.writes.some((write) => write.table === 'jurispurama_payments'), false)
  assert.equal(state.emails.length, 1)
})
test('failed or absent local save after deposit returns reconciliation without success notifications', async () => {
  for (const missing of [false, true]) {
    state = fixture()
    state.missingUpdate = missing
    state.updateError = missing ? null : { message: 'private database error' }
    const response = await POST(request(), context)
    assert.equal(response.status, 503)
    const body = await response.json()
    assert.equal(body.code, 'reconciliation_required')
    assert.equal(body.tracking_number, 'provider-123')
    assert.equal(state.writes.length, 1)
    assert.deepEqual(state.emails, [])
  }
})
test('cron without activation does not query or mutate a receipt', async () => {
  delete process.env.AR24_ENABLED
  assert.equal((await GET(cronRequest())).status, 503)
  assert.deepEqual(state.queries, [])
  assert.deepEqual(state.writes, [])
})
const sentAt = new Date(Date.now() - 10800000).toISOString()
const receivedAt = new Date(Date.now() - 3600000).toISOString()
const pending = (tracking = 'provider-123') => ({ id: 'doc-test', case_id: 'case-test', title: 'Test', tracking_number: tracking, sent_at: sentAt, sent_to: 'Test' })
test('cron never upgrades a historical simulated deposit to received', async () => {
  state.pending = [pending('SIM-AR-historical')]
  const response = await GET(cronRequest())
  const body = await response.json()
  assert.equal(response.status, 200)
  assert.equal(body.ok, true)
  assert.equal(body.failed, 0)
  assert.equal(body.updated, 0)
  assert.equal(state.requests.length, 0)
  assert.deepEqual(state.writes, [])
  assert.deepEqual(state.emails, [])
})
test('cron isolates an unconfirmed response and processes the next receipt', async () => {
  state.pending = [pending('provider-bad'), pending()]
  state.provider = (url) => new Response(JSON.stringify(url.endsWith('provider-bad')
    ? { tracking_number: 'provider-bad', status: 'received' }
    : { tracking_number: 'provider-123', status: 'received', received_at: receivedAt }))
  const response = await GET(cronRequest())
  const body = await response.json()
  assert.equal(response.status, 503)
  assert.equal(body.ok, false)
  assert.equal(body.failed, 1)
  assert.equal(body.updated, 1)
  assert.equal(body.results[0].error, 'ar24_unconfirmed')
  assert.equal(body.results[1].persisted, true)
  assert.deepEqual(state.writes[0].payload, { ar_received_at: receivedAt })
  assert.ok(state.writes[0].filters.some((filter) => filter.join(':') === 'is:ar_received_at:'))
  assert.equal(state.emails.length, 1)
})
test('cron sends no receipt notification when its conditional update finds no row', async () => {
  state.pending = [pending()]
  state.missingUpdate = true
  state.provider = () => new Response(JSON.stringify({ tracking_number: 'provider-123', status: 'received', received_at: receivedAt }))
  const response = await GET(cronRequest())
  const body = await response.json()
  assert.equal(response.status, 503)
  assert.equal(body.ok, false)
  assert.equal(body.failed, 1)
  assert.equal(body.results[0].persisted, false)
  assert.equal(body.results[0].error, 'receipt_update_not_applied')
  assert.equal(body.updated, 0)
  assert.equal(state.writes.length, 1)
  assert.deepEqual(state.emails, [])
})
test('cron reports failure when every provider status check fails', async () => {
  state.pending = [pending('provider-a'), pending('provider-b')]
  state.provider = () => new Response('private provider error', { status: 500 })
  const response = await GET(cronRequest())
  const body = await response.json()
  assert.equal(response.status, 503)
  assert.equal(body.ok, false)
  assert.equal(body.failed, 2)
  assert.equal(body.updated, 0)
  assert.equal(body.results.every((result) => result.error === 'ar24_unconfirmed'), true)
  assert.deepEqual(state.writes, [])
  assert.deepEqual(state.emails, [])
})
test('cron reports a failed receipt save without exposing database errors or notifying', async () => {
  state.pending = [pending()]
  state.updateError = { message: 'private database error' }
  state.provider = () => new Response(JSON.stringify({ tracking_number: 'provider-123', status: 'received', received_at: receivedAt }))
  const response = await GET(cronRequest())
  const body = await response.json()
  assert.equal(response.status, 503)
  assert.equal(body.ok, false)
  assert.equal(body.failed, 1)
  assert.equal(body.updated, 0)
  assert.deepEqual(body.results, [{ id: 'doc-test', received: true, persisted: false, error: 'receipt_update_failed' }])
  assert.doesNotMatch(JSON.stringify(body), /private/)
  assert.equal(state.writes.length, 1)
  assert.deepEqual(state.emails, [])
})
