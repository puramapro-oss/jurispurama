import { test, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { fixture, cronRequest } from './ar24-route-harness.mjs'
import { configured, encryptedResponse } from './ar24-fixtures.mjs'
import { sendAR24ReceiptEmail, AR24EmailError } from '../src/lib/ar24-email.ts'
const { GET } = await import('../src/app/api/cron/check-ar-status/route.ts')
const originalFetch = globalThis.fetch
const previous = Object.fromEntries([...Object.keys(configured), 'CRON_SECRET', 'RESEND_API_KEY'].map(key => [key, process.env[key]]))
let state
beforeEach(() => {
  Object.assign(process.env, configured, { CRON_SECRET: 'cron-test-not-real', RESEND_API_KEY: 're-test-not-real' })
  state = fixture()
})
afterEach(() => {
  globalThis.fetch = originalFetch
  for (const [key, value] of Object.entries(previous)) { if (value === undefined) delete process.env[key]; else process.env[key] = value }
  delete globalThis.__ar24TestState
})
const flush = () => new Promise(resolve => setImmediate(resolve))
const pending = id => ({ id: `doc-${id}`, case_id: 'case-test', title: 'Synthetic', tracking_number: String(id), sent_at: '2026-01-15T10:00:00Z' })
const receipt = (url, init) => encryptedResponse({ id: Number(new URL(url).searchParams.get('id')), type: 'lre', status: 'ar', send_fail: false, view_date: '2026-01-15 13:00:00' }, url, init)
const prepared = () => ({ payload: '{"from":"test@example.invalid","to":["recipient@example.invalid"],"subject":"Fixture","html":"<p>Fixture</p>"}',
  idempotency_key: 'juris-ar24-receipt/00000000-0000-4000-8000-000000000001', retry_until: new Date(Date.now() + 82_800_000).toISOString() })
function clock(t) {
  let elapsed = 0
  t.mock.timers.enable({ apis: ['setTimeout'] }); t.mock.method(performance, 'now', () => elapsed)
  return async ms => { elapsed += ms; t.mock.timers.tick(ms); await flush() }
}

test('receipt commit followed by lost DB response is recovered from outbox on a fresh invocation', async t => {
  const tick = clock(t); state.pending = [pending(123)]; state.provider = receipt
  let release
  state.afterRpc = (rpc, result) => {
    if (rpc.name === 'ar24_complete_tracking' && result?.persisted) return new Promise(resolve => { release = resolve })
  }
  const running = GET(cronRequest()); await flush(); await tick(10_000)
  const body = await (await running).json()
  assert.equal(body.updated, 0); assert.equal(body.results[0].persisted, false)
  assert.equal(state.pending.length, 0); assert.equal(state.outbox.length, 1); assert.equal(state.emails.length, 0)
  state.afterRpc = null
  const next = await GET(cronRequest()), resumed = await next.json()
  assert.equal(next.status, 200); assert.equal(resumed.emailed, 1)
  assert.equal(state.requests.length, 1, 'confirmed receipt is not polled again')
  release(); await flush(); assert.equal(state.emails.length, 1)
})

test('lost email acknowledgement retries the same persisted payload/key and accepts only fenced DB completion', async t => {
  const tick = clock(t); state.pending = [pending(123)]; state.provider = receipt
  let release
  state.beforeRpc = rpc => {
    if (rpc.name === 'ar24_finish_notification') return new Promise(resolve => { release = resolve })
  }
  const running = GET(cronRequest()); await flush(); await tick(10_000)
  const body = await (await running).json()
  assert.equal(body.emailed, 0); assert.equal(state.outbox[0].state, 'pending')
  const original = state.emailRequests[0][1]
  state.beforeRpc = null; state.now += 120_001; state.outbox[0].facts.document_title = 'Later rendering must not change payload'
  const resumed = await GET(cronRequest())
  assert.equal(resumed.status, 200); assert.equal(state.requests.length, 1)
  const retry = state.emailRequests[1][1]
  assert.equal(retry.body, original.body); assert.equal(retry.headers['Idempotency-Key'], original.headers['Idempotency-Key'])
  assert.equal(state.outbox[0].state, 'sent')
  release(); await flush(); assert.equal(state.emailRequests.length, 2)
})

test('an available email is attempted before a slow tracking backlog consumes the shared budget', async t => {
  const tick = clock(t); state.pending = [pending(123)]; state.provider = receipt
  delete process.env.RESEND_API_KEY
  await GET(cronRequest())
  state.outbox[0].due = state.now
  process.env.RESEND_API_KEY = 're-test-not-real'
  state.pending = Array.from({ length: 205 }, (_, i) => pending(1000 + i))
  state.provider = () => new Promise(() => {})
  const running = GET(cronRequest()); await flush()
  assert.equal(state.emailRequests.length, 1)
  for (let i = 0; i < 6; i++) await tick(15_000)
  const body = await (await running).json()
  assert.equal(body.emailed, 1); assert.equal(body.budget_exhausted, true)
})

test('route cap 200 leaves the remaining five claims for a subsequent cron', async () => {
  state.pending = Array.from({ length: 205 }, (_, i) => pending(1000 + i))
  state.provider = (url, init) => encryptedResponse({ id: Number(new URL(url).searchParams.get('id')), type: 'lre', status: 'sent' }, url, init)
  const first = await (await GET(cronRequest())).json()
  assert.equal(first.scanned, 200); assert.equal(first.deferred, 5)
  const second = await (await GET(cronRequest())).json()
  assert.equal(second.scanned, 5); assert.equal(second.deferred, 0)
  assert.equal(new Set(state.requests.map(([url]) => new URL(url).searchParams.get('id'))).size, 205)
})

test('missing durable migration blocks all external work', async () => {
  state.pending = [pending(123)]; state.beforeRpc = () => { throw new Error('private missing function detail') }
  const response = await GET(cronRequest())
  assert.equal(response.status, 503); assert.equal((await response.json()).code, 'queue_unconfirmed')
  assert.equal(state.requests.length, 0); assert.equal(state.emailRequests.length, 0)
})

test('email transport sends the exact stored JSON and idempotency header once', async () => {
  const input = prepared()
  const id = await sendAR24ReceiptEmail(input, new AbortController().signal)
  assert.equal(id, 'provider-test-id'); assert.equal(state.emailRequests.length, 1)
  const [url, request] = state.emailRequests[0]
  assert.equal(url, 'https://api.resend.com/emails'); assert.equal(request.method, 'POST')
  assert.equal(request.body, input.payload); assert.equal(request.headers['Idempotency-Key'], input.idempotency_key)
  assert.equal(request.redirect, 'error')
})

test('email cannot start without configuration, after expiry or after cancellation', async () => {
  delete process.env.RESEND_API_KEY
  await assert.rejects(sendAR24ReceiptEmail(prepared(), new AbortController().signal), AR24EmailError)
  process.env.RESEND_API_KEY = 're-test-not-real'
  await assert.rejects(sendAR24ReceiptEmail({ ...prepared(), retry_until: new Date(Date.now()).toISOString() }, new AbortController().signal), e => e instanceof AR24EmailError && e.reconcile)
  const controller = new AbortController(); controller.abort()
  await assert.rejects(sendAR24ReceiptEmail(prepared(), controller.signal))
  assert.equal(state.emailRequests.length, 0)
})

test('email malformed/oversized responses are bounded and never confirmed', async () => {
  for (const result of [Response.json({ id: ['not-a-string'] }), new Response('not-json'), new Response('x'.repeat(16385))]) {
    state.emailResult = () => result
    await assert.rejects(sendAR24ReceiptEmail(prepared(), new AbortController().signal), AR24EmailError)
  }
  assert.equal(state.emailRequests.length, 3, 'no automatic POST retry')
})

test('email idempotency conflicts require reconciliation, concurrent provider requests stay retryable, errors are redacted', async () => {
  for (const [name, reconcile] of [['invalid_idempotent_request', true], ['concurrent_idempotent_requests', false]]) {
    state.emailResult = () => Response.json({ name, message: 'private recipient information' }, { status: 409 })
    await assert.rejects(sendAR24ReceiptEmail(prepared(), new AbortController().signal), error => {
      assert.equal(error.reconcile, reconcile); assert.doesNotMatch(error.message, /private/); return true
    })
  }
  assert.equal(state.emailRequests.length, 2)
})
