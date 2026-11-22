import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { callback, deferred, flush } from './lifecycle-source.mjs'

const baseRef = process.env.JURIS_CHAT_TEST_BASE_REF
const streamSource = readFileSync(new URL('../src/lib/chat-stream.ts', import.meta.url), 'utf8')
const streamCode = ts.transpileModule(streamSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText
const { readChatStream } = await import(`data:text/javascript;base64,${Buffer.from(streamCode).toString('base64')}`)

function harness({ caseId = null, initialCaseId = 'new' } = {}) {
  const state = { caseId, messages: [], documents: [], caseRow: null, streaming: false, errored: null }
  const errors = [], requests = [], updates = [], history = []
  const streamRef = { current: null }, loadedCaseRef = { current: null }, caseIdRef = { current: caseId }
  const scopeRef = { current: new AbortController() }
  const context = {
    caseId, initialCaseId, streaming: false, loading: false, AbortController, TextDecoder, Date,
    scopeRef, messageSequence: { current: 0 }, readChatStream,
    streamRef, loadedCaseRef, caseIdRef, autoScrollRef: { current: true },
    toast: { error: value => errors.push(value) },
    window: { location: { pathname: `/chat/${initialCaseId}` }, history: { state: null, replaceState: (...args) => history.push(args) } },
    fetch: (url, options) => {
      const pending = deferred()
      requests.push({ url, options, ...pending })
      return pending.promise
    },
  }
  for (const [setter, key] of Object.entries({
    setCaseId: 'caseId', setMessages: 'messages', setDocuments: 'documents',
    setCaseRow: 'caseRow', setStreaming: 'streaming', setErrored: 'errored',
  })) context[setter] = value => { state[key] = typeof value === 'function' ? value(state[key]) : value; updates.push(key) }
  return { state, errors, requests, updates, history, loadedCaseRef, caseIdRef, context,
    send: callback('src/hooks/useChatMessages.ts', 'sendMessage', context, baseRef),
    abort: () => scopeRef.current.abort() }
}

function completedStream() {
  const events = [
    { type: 'case_created', caseId: 'created-fixture' },
    { type: 'text', content: 'Réponse synthétique' },
    { type: 'done', caseId: 'created-fixture', meta: { next_actions: ['generate_document'] } },
  ].map(event => `data: ${JSON.stringify(event)}\n\n`).join('')
  return new Response(events, { headers: { 'content-type': 'text/event-stream' } })
}

async function waitForRequests(h, count) {
  for (let i = 0; i < 10 && h.requests.length < count; i++) await new Promise(resolve => setImmediate(resolve))
  assert.equal(h.requests.length, count)
}

for (const mode of ['success', 'failure']) {
  test(`a cancelled POST ${mode} cannot mutate a departed conversation`, async () => {
    const h = harness(), task = h.send('Message synthétique')
    h.abort()
    assert.equal(h.requests[0].options.signal?.aborted, true)
    const count = h.updates.length
    if (mode === 'success') h.requests[0].resolve(completedStream())
    else h.requests[0].reject(new Error('obsolete provider detail'))
    await task
    assert.equal(h.updates.length, count)
    assert.deepEqual(h.errors, [])
    assert.equal(h.requests.length, 1)
    assert.deepEqual(h.history, [])
  })
}

test('late stream chunks cannot change the case ID or append text after cancellation', async () => {
  const h = harness(), chunk = deferred(), task = h.send('Message synthétique')
  h.requests[0].resolve({ ok: true, body: { getReader: () => ({
    read: () => chunk.promise, cancel: async () => {}, releaseLock: () => {},
  }) } })
  await flush()
  h.abort()
  assert.equal(h.requests[0].options.signal?.aborted, true)
  const before = JSON.stringify(h.state)
  chunk.resolve({ done: false, value: new TextEncoder().encode('data: {"type":"case_created","caseId":"obsolete"}\n\n') })
  await task
  assert.equal(JSON.stringify(h.state), before)
  assert.deepEqual(h.history, [])
  assert.deepEqual(h.errors, [])
})

for (const phase of ['transport', 'json']) {
  test(`a cancelled refresh ignores late ${phase}, including history and loaded identity`, async () => {
    const h = harness(), task = h.send('Message synthétique'), body = deferred()
    h.requests[0].resolve(completedStream())
    await waitForRequests(h, 2)
    if (phase === 'json') { h.requests[1].resolve({ ok: true, json: () => body.promise }); await flush() }
    h.abort()
    assert.equal(h.requests[1].options.signal?.aborted, true)
    const before = JSON.stringify(h.state)
    const loadedBefore = h.loadedCaseRef.current
    if (phase === 'json') body.resolve({ case: { id: 'obsolete' }, documents: [{ id: 'obsolete' }] })
    else h.requests[1].resolve({ ok: true, json: async () => ({ case: { id: 'obsolete' }, documents: [] }) })
    await task
    assert.equal(JSON.stringify(h.state), before)
    assert.equal(h.loadedCaseRef.current, loadedBefore)
    assert.deepEqual(h.history, [])
    assert.deepEqual(h.errors, [])
  })
}

test('a new conversation preserves its request, streamed actions and created identity', async () => {
  const h = harness(), task = h.send('Message synthétique')
  assert.equal(h.requests[0].url, '/api/ai/chat')
  assert.equal(h.requests[0].options.method, 'POST')
  assert.deepEqual(JSON.parse(h.requests[0].options.body), { message: 'Message synthétique' })
  h.requests[0].resolve(completedStream())
  await waitForRequests(h, 2)
  assert.equal(h.requests[1].url, '/api/cases/created-fixture')
  h.requests[1].resolve({ ok: true, json: async () => ({ case: { id: 'created-fixture' }, documents: [] }) })
  await task
  assert.equal(h.state.caseId, 'created-fixture')
  assert.equal(h.state.caseRow.id, 'created-fixture')
  assert.equal(h.loadedCaseRef.current, 'created-fixture')
  assert.equal(h.state.streaming, false)
  assert.equal(h.state.messages[1].content, 'Réponse synthétique')
  assert.deepEqual(Array.from(h.state.messages[1].actions), ['generate_document'])
  assert.deepEqual(h.history, [[null, '', '/chat/created-fixture']])
  assert.deepEqual(h.errors, [])
})

test('a failed final refresh leaves the created case eligible for loading after adoption', async () => {
  const h = harness(), task = h.send('Message synthétique')
  h.requests[0].resolve(completedStream())
  await waitForRequests(h, 2)
  h.requests[1].resolve({ ok: false, status: 503 })
  await task
  assert.equal(h.state.caseId, 'created-fixture')
  assert.equal(h.state.caseRow, null)
  assert.equal(h.loadedCaseRef.current, null)
  assert.equal(h.state.streaming, false)
  assert.equal(h.state.messages[1].content, 'Réponse synthétique')
})

const RECOVERED_CASE = '11111111-1111-4111-8111-111111111111'
const EXISTING_CASE = '22222222-2222-4222-8222-222222222222'
const RECOVERY_ERROR = 'Le dossier est créé, mais l’enregistrement du message n’a pas été confirmé.'

test('HTTP failure adopts a confirmed new dossier and the same send callback reuses it only on an explicit retry', async () => {
  const h = harness(), first = h.send('Première demande')
  h.requests[0].resolve(Response.json({ error: RECOVERY_ERROR, caseId: RECOVERED_CASE }, { status: 500 }))
  await first
  assert.equal(h.state.caseId, RECOVERED_CASE)
  assert.equal(h.caseIdRef.current, RECOVERED_CASE)
  assert.equal(h.state.errored, RECOVERY_ERROR)
  assert.equal(h.state.streaming, false)
  assert.deepEqual(h.history, [[null, '', `/chat/${RECOVERED_CASE}`]])
  assert.equal(h.requests.length, 1)
  const retry = h.send('Reprise explicite')
  assert.deepEqual(JSON.parse(h.requests[1].options.body), { caseId: RECOVERED_CASE, message: 'Reprise explicite' })
  h.requests[1].resolve(Response.json({ error: 'Enregistrement non confirmé.' }, { status: 500 }))
  await retry
  assert.equal(h.state.caseId, RECOVERED_CASE)
})

for (const id of ['invalid', '//example.invalid', 42, null]) {
  test(`HTTP failure refuses invalid recovery identity ${JSON.stringify(id)}`, async () => {
    const h = harness(), task = h.send('Question')
    h.requests[0].resolve(Response.json({ error: RECOVERY_ERROR, caseId: id }, { status: 500 }))
    await task
    assert.equal(h.state.caseId, null)
    assert.equal(h.caseIdRef.current, null)
    assert.equal(h.state.errored, RECOVERY_ERROR)
    assert.deepEqual(h.history, [])
  })
}

test('an HTTP recovery identity never replaces an existing conversation', async () => {
  const h = harness({ caseId: EXISTING_CASE, initialCaseId: EXISTING_CASE }), task = h.send('Question')
  h.requests[0].resolve(Response.json({ error: RECOVERY_ERROR, caseId: RECOVERED_CASE }, { status: 500 }))
  await task
  assert.equal(h.state.caseId, EXISTING_CASE)
  assert.equal(h.caseIdRef.current, EXISTING_CASE)
  assert.deepEqual(h.history, [])
})

test('cancellation during error JSON parsing cannot adopt the recovery dossier or notify', async () => {
  const h = harness(), body = deferred(), task = h.send('Question')
  h.requests[0].resolve({ ok: false, status: 500, json: () => body.promise })
  await flush()
  h.abort()
  const before = JSON.stringify(h.state)
  body.resolve({ error: RECOVERY_ERROR, caseId: RECOVERED_CASE })
  await task
  assert.equal(JSON.stringify(h.state), before)
  assert.equal(h.caseIdRef.current, null)
  assert.deepEqual(h.history, [])
  assert.deepEqual(h.errors, [])
})

test('a recovered dossier cannot rewrite a page reached while its HTTP error was pending', async () => {
  const h = harness(), body = deferred(), task = h.send('Question')
  h.requests[0].resolve({ ok: false, status: 500, json: () => body.promise })
  await flush()
  h.context.window.location.pathname = '/dashboard'
  body.resolve({ error: RECOVERY_ERROR, caseId: RECOVERED_CASE })
  await task
  assert.deepEqual(h.history, [])
})
