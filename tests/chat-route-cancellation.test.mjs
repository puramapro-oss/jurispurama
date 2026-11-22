import { afterEach, beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { events, fixture, request } from './chat-route-harness.mjs'
const { POST } = await import('../src/app/api/ai/chat/route.ts')
let state
beforeEach(() => { state = fixture() })
afterEach(() => { state.providerGate?.resolve() })
const assistantWrites = () => state.writes.filter(write => write.payload.role === 'assistant')

test('already cancelled request performs no authentication, database or model work', async () => {
  const abort = new AbortController()
  abort.abort()
  const response = await POST(request({}, {}, abort.signal))
  assert.equal(response.status, 499)
  assert.deepEqual(state.authCalls, [])
  assert.deepEqual(state.queries, [])
  assert.deepEqual(state.providerCalls, [])
})

test('cancellation during a history read stops before a user insert', async () => {
  const abort = new AbortController()
  state.afterQuery = query => {
    if (query.table === 'jurispurama_messages' && query.op === 'select') abort.abort()
  }
  const response = await POST(request({}, {}, abort.signal))
  assert.equal(response.status, 499)
  assert.deepEqual(state.writes, [])
  assert.deepEqual(state.providerCalls, [])
})

test('response cancellation aborts and drains a waiting model without assistant persistence', { timeout: 2000 }, async () => {
  state.providerGate = Promise.withResolvers()
  const response = await POST(request())
  await state.providerStarted.promise
  assert.ok(state.providerSignal, 'the actual route must provide an AbortSignal')
  await response.body.cancel()
  await state.providerDone.promise
  assert.equal(state.providerSignal.aborted, true)
  assert.equal(state.providerFinally, 1)
  assert.deepEqual(assistantWrites(), [])
})

test('request cancellation rejects its pending reader and drains the model', { timeout: 2000 }, async () => {
  state.providerGate = Promise.withResolvers()
  const abort = new AbortController()
  const response = await POST(request({}, {}, abort.signal))
  await state.providerStarted.promise
  assert.ok(state.providerSignal)
  const reader = response.body.getReader()
  const read = reader.read()
  abort.abort()
  await assert.rejects(read, { name: 'AbortError' })
  await state.providerDone.promise
  reader.releaseLock()
  assert.equal(state.providerSignal.aborted, true)
  assert.deepEqual(assistantWrites(), [])
})

test('late provider work after response cancellation cannot enqueue or save', { timeout: 2000 }, async () => {
  state.providerGate = Promise.withResolvers()
  state.ignoreProviderAbort = true
  const response = await POST(request())
  await state.providerStarted.promise
  assert.ok(state.providerSignal)
  await response.body.cancel()
  state.providerGate.resolve()
  await state.providerDone.promise
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(state.providerSignal.aborted, true)
  assert.deepEqual(assistantWrites(), [])
})

test('cancellation at model completion prevents assistant insertion', async () => {
  const abort = new AbortController()
  state.beforeProviderEnd = () => abort.abort()
  const response = await POST(request({}, {}, abort.signal))
  await assert.rejects(response.text(), { name: 'AbortError' })
  assert.deepEqual(assistantWrites(), [])
})

test('cancellation during assistant insertion cannot continue to case metadata or done', { timeout: 2000 }, async () => {
  const entered = Promise.withResolvers()
  const release = Promise.withResolvers()
  state.providerChunks = ['Réponse.\n<juris-meta>{"phase":"analyse"}</juris-meta>']
  state.beforeQuery = async query => {
    if (query.payload?.role === 'assistant') { entered.resolve(); await release.promise }
  }
  const response = await POST(request())
  await entered.promise
  try {
    assert.ok(state.providerSignal)
    await response.body.cancel()
  } finally { release.resolve() }
  await new Promise(resolve => setImmediate(resolve))
  assert.deepEqual(assistantWrites(), [])
  assert.equal(state.writes.some(write => write.op === 'update'), false)
})

test('a receipt already committed before cancellation remains stored but triggers no later metadata write', { timeout: 2000 }, async () => {
  const abort = new AbortController()
  state.providerChunks = ['Réponse.\n<juris-meta>{"phase":"analyse"}</juris-meta>']
  state.afterQuery = query => {
    if (query.payload?.role === 'assistant') abort.abort()
  }
  const response = await POST(request({}, {}, abort.signal))
  await assert.rejects(response.text(), { name: 'AbortError' })
  assert.equal(assistantWrites().length, 1)
  assert.equal(state.writes.some(write => write.op === 'update'), false)
})

test('server deadline emits one public error and aborts a waiting model without persistence', { timeout: 2000 }, async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  state.providerGate = Promise.withResolvers()
  const response = await POST(request())
  await state.providerStarted.promise
  assert.ok(state.providerSignal)
  const resultPromise = events(response)
  t.mock.timers.tick(110_000)
  const result = await resultPromise
  await state.providerDone.promise
  assert.equal(result.filter(event => event.type === 'error').length, 1)
  assert.match(result.find(event => event.type === 'error').error, /délai/i)
  assert.equal(result.some(event => event.type === 'done'), false)
  assert.equal(state.providerSignal.aborted, true)
  assert.deepEqual(assistantWrites(), [])
})

test('successful completion removes the deadline and keeps its single confirmation', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const result = await events(await POST(request()))
  t.mock.timers.tick(110_000)
  assert.equal(result.filter(event => event.type === 'done').length, 1)
  assert.equal(state.providerSignal?.aborted, false)
  assert.equal(assistantWrites().length, 1)
})
