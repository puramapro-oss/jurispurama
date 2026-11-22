import { test, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { fixture, cronRequest } from './ar24-route-harness.mjs'
import { configured, encryptedResponse } from './ar24-fixtures.mjs'
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
  for (const [key, value] of Object.entries(previous)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
  delete globalThis.__ar24TestState
})
const pending = id => ({ id: `doc-${id}`, case_id: 'case-test', title: 'Synthetic', tracking_number: String(id), sent_at: '2026-01-15T10:00:00Z' })
const flush = () => new Promise(resolve => setImmediate(resolve))
function clock(t) {
  let elapsed = 0
  t.mock.timers.enable({ apis: ['setTimeout'] })
  t.mock.method(performance, 'now', () => elapsed)
  return {
    set(value) { elapsed = value },
    async tick(ms) { elapsed += ms; t.mock.timers.tick(ms); await flush() },
  }
}
const receipt = (url, init) => encryptedResponse({
  id: Number(new URL(url).searchParams.get('id')), type: 'lre', status: 'ar', send_fail: false, view_date: '2026-01-15 13:00:00',
}, url, init)

test('slow provider stops at 90 seconds, aborts GETs and preserves all unconfirmed rows', async t => {
  const time = clock(t)
  state.pending = Array.from({ length: 200 }, (_, index) => pending(index + 1))
  const signals = []
  state.provider = (_url, init) => {
    signals.push(init.signal)
    // Deliberately ignore abort: the route must still return within its own budget.
    return new Promise(() => {})
  }
  const response = GET(cronRequest())
  await flush()
  for (let i = 0; i < 6; i++) {
    assert.equal(signals.length, i + 1)
    await time.tick(15_000)
  }
  const result = await response
  const body = await result.json()
  assert.equal(result.status, 503)
  assert.equal(body.updated, 0); assert.equal(body.failed, 6); assert.equal(body.deferred, null)
  assert.equal(body.budget_exhausted, true)
  assert.equal(body.results.every(row => !row.received && row.error === 'status_time_budget_exhausted'), true)
  assert.equal(signals.length, 6); assert.equal(signals.every(signal => signal.aborted), true)
  assert.equal(state.pending.length, 200)
  assert.deepEqual(state.writes, []); assert.deepEqual(state.emails, [])
})

test('last GET is capped to remaining 500ms and a later cron resumes only unconfirmed rows', async t => {
  const time = clock(t)
  state.pending = [pending(123), pending(124), pending(125)]
  let lastSignal
  state.provider = (url, init) => {
    if (new URL(url).searchParams.get('id') === '123') return receipt(url, init)
    lastSignal = init.signal
    return new Promise(() => {})
  }
  state.emailResult = () => { time.set(89_500); return { ok: true } }
  const first = GET(cronRequest())
  await flush()
  assert.equal(state.requests.length, 2)
  await time.tick(499)
  assert.equal(lastSignal.aborted, false)
  await time.tick(1)
  const firstBody = await (await first).json()
  assert.equal(firstBody.updated, 1); assert.equal(firstBody.failed, 1); assert.equal(firstBody.deferred, null)
  assert.equal(lastSignal.aborted, true)
  assert.deepEqual(state.pending.map(doc => doc.id), ['doc-124', 'doc-125'])
  assert.equal(state.emails.length, 1)
  state.provider = receipt
  state.now += 120_001 // The unknown claim becomes available after its durable lease.
  state.emailResult = null
  const resumed = await GET(cronRequest())
  const body = await resumed.json()
  assert.equal(resumed.status, 200)
  assert.equal(body.updated, 2); assert.equal(body.deferred, 0)
  assert.deepEqual(body.results.map(row => row.id), ['doc-124', 'doc-125'])
  assert.deepEqual(state.pending, [])
  assert.equal(state.requests.length, 4); assert.equal(state.emails.length, 3)
})

test('a stalled initial DB read is bounded before any provider call', async t => {
  const time = clock(t)
  let signal
  state.beforeRpc = query => { signal = query.signal; return new Promise(() => {}) }
  const response = GET(cronRequest())
  await flush(); await time.tick(10_000)
  assert.equal((await response).status, 503)
  assert.equal(signal.aborted, true)
  assert.deepEqual(state.requests, []); assert.deepEqual(state.writes, [])
})

test('a timed-out receipt write is unconfirmed, not counted or notified as persisted', async t => {
  const time = clock(t)
  state.pending = [pending(123)]
  state.provider = receipt
  let signal
  let releaseWrite
  state.beforeRpc = query => {
    if (query.name === 'ar24_complete_tracking') {
      signal = query.signal; return new Promise(resolve => { releaseWrite = resolve })
    }
  }
  const response = GET(cronRequest())
  await flush(); await time.tick(10_000)
  const result = await response, body = await result.json()
  assert.equal(result.status, 503)
  assert.equal(body.updated, 0)
  assert.deepEqual(body.results, [{ id: 'doc-123', received: true, persisted: false, error: 'receipt_update_unconfirmed' }])
  assert.equal(signal.aborted, true); assert.equal(state.pending.length, 1)
  assert.deepEqual(state.writes, []); assert.deepEqual(state.emails, [])
  releaseWrite(); await flush()
  assert.deepEqual(state.writes, []); assert.deepEqual(state.emails, [])
})

test('a provider reply arriving after timeout cannot later persist or notify a receipt', async t => {
  const time = clock(t)
  state.pending = [pending(123)]
  let completeReply, args
  state.provider = (...request) => { args = request; return new Promise(resolve => { completeReply = resolve }) }
  const response = GET(cronRequest())
  await flush(); await time.tick(15_000)
  const result = await response, body = await result.json()
  assert.equal(result.status, 503); assert.equal(body.updated, 0)
  assert.equal(args[1].signal.aborted, true)
  completeReply(receipt(...args)); await flush()
  assert.deepEqual(state.writes, []); assert.deepEqual(state.emails, [])
  assert.equal(state.pending.length, 1)
})

test('a stalled email is bounded and reported uncertain without repeating a confirmed receipt', async t => {
  const time = clock(t)
  state.pending = [pending(123)]
  state.provider = receipt
  state.emailResult = () => new Promise(() => {})
  const response = GET(cronRequest())
  await flush(); await time.tick(10_000)
  const result = await response, body = await result.json()
  assert.equal(result.status, 503); assert.equal(body.updated, 1)
  assert.deepEqual(body.results, [{ id: 'doc-123', received: true, persisted: true }])
  assert.equal(body.notification_results[0].error, 'receipt_notification_unconfirmed')
  assert.deepEqual(state.pending, [])
  assert.equal((await GET(cronRequest())).status, 200)
  assert.equal(state.emails.length, 1); assert.equal(state.requests.length, 1)
})

test('an explicit email failure remains partial and redacted after confirmed receipt', async () => {
  state.pending = [pending(123)]
  state.provider = receipt
  state.emailResult = () => ({ ok: false, error: 'private provider information' })
  const result = await GET(cronRequest()), body = await result.json()
  assert.equal(result.status, 503); assert.equal(body.updated, 1)
  assert.equal(body.results[0].persisted, true)
  assert.equal(body.notification_results[0].error, 'receipt_notification_unconfirmed')
  assert.doesNotMatch(JSON.stringify(body), /private/)
  assert.equal((await GET(cronRequest())).status, 200)
  assert.equal(state.emails.length, 1)
})
