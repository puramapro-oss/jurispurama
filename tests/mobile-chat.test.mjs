import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import vm from 'node:vm'
import ts from 'typescript'

const CASE = '11111111-1111-4111-8111-111111111111'
const OTHER_CASE = '22222222-2222-4222-8222-222222222222'
const BASE = 'https://juris-fixture.invalid'
const baseRef = process.env.JURIS_MOBILE_TEST_BASE_REF
const normalize = value => JSON.parse(JSON.stringify(value))
const deferred = () => {
  let resolve, reject
  const promise = new Promise((ok, fail) => { resolve = ok; reject = fail })
  return { promise, resolve, reject }
}
const tick = () => new Promise(resolve => setImmediate(resolve))

function moduleFromSource(file, modules) {
  const source = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const loadedModule = { exports: {} }
  vm.runInNewContext(code, {
    module: loadedModule, exports: loadedModule.exports, TextDecoder, TextEncoder, ReadableStream, Error,
    require(name) { assert.ok(name in modules, `unexpected dependency ${name}`); return modules[name] },
  }, { filename: file })
  return loadedModule.exports
}
const reader = moduleFromSource('src/lib/chat-stream.ts', {})
function chatModule(fetch) {
  return moduleFromSource('mobile/lib/chat.ts', {
    'expo/fetch': { fetch }, './api': { API_BASE: BASE }, '../../src/lib/chat-stream': reader,
  })
}

function response(events = [
  { type: 'case_created', caseId: CASE }, { type: 'text', content: 'Réponse vérifiée' },
  { type: 'done', caseId: CASE },
], { split = false, close = true } = {}) {
  const bytes = new TextEncoder().encode(events.map(event => `data: ${JSON.stringify(event)}\n\n`).join('') + 'data: [DONE]\n\n')
  return new Response(new ReadableStream({ start(controller) {
    if (split) for (const byte of bytes) controller.enqueue(Uint8Array.of(byte))
    else controller.enqueue(bytes)
    if (close) controller.close()
  } }), { headers: { 'content-type': 'text/event-stream; charset=utf-8' } })
}

function screen({ tokenOwner = 'owner-a', session = null, fetchImpl = () => Promise.resolve(response()) } = {}) {
  const path = 'mobile/app/(tabs)/chat.tsx'
  const source = baseRef
    ? execFileSync('git', ['show', `${baseRef}:${path}`], { encoding: 'utf8' })
    : readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
  const ast = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  let send, stop
  const visit = node => {
    if (ts.isFunctionDeclaration(node) && node.name?.text === 'send') send = node
    if (ts.isFunctionDeclaration(node) && node.name?.text === 'stop') stop = node
    ts.forEachChild(node, visit)
  }
  visit(ast); assert.ok(send)
  const state = { input: 'Question actuelle', messages: [], loading: false, error: null }
  const requests = [], updates = [], auth = { ownerId: 'owner-a' }
  const timers = new Map()
  let timerId = 0
  const transport = (url, options) => { requests.push({ url, options }); return fetchImpl(url, options) }
  const context = {
    ownerId: 'owner-a', input: state.input, messages: state.messages, loading: false,
    requestRef: { current: null }, caseRef: { current: null }, messageSequence: { current: 0 },
    requestTimeoutRef: { current: null },
    useAuth: { getState: () => ({ user: auth.ownerId ? { id: auth.ownerId } : null }) },
    supabase: { auth: { getSession: () => session?.promise ?? Promise.resolve({ data: { session: { access_token: 'fixture-only-token', user: { id: tokenOwner } } } }) } },
    fetch: transport, API_BASE: BASE, sendChatMessage: chatModule(transport).sendChatMessage,
    AbortController, Date, Error, Haptics: { ImpactFeedbackStyle: { Light: 'light' }, impactAsync: async () => {} },
    listRef: { current: { scrollToEnd() {} } },
    setTimeout: (fn, delay) => { const id = ++timerId; timers.set(id, { fn, delay }); return id },
    clearTimeout: id => timers.delete(id),
  }
  for (const [name, key] of Object.entries({ setInput: 'input', setMessages: 'messages', setLoading: 'loading', setError: 'error' })) {
    context[name] = value => { state[key] = typeof value === 'function' ? value(state[key]) : value; updates.push(key) }
  }
  const code = ts.transpileModule(`${stop?.getText(ast) ?? ''}\n${send.getText(ast)}; globalThis.actualSend=send`, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText
  vm.runInNewContext(code, context)
  return { state, requests, updates, auth, context, timers, send: context.actualSend, stop: context.stop,
    cancel() { context.requestRef.current?.abort(); context.requestRef.current = null } }
}

test('actual mobile send uses the server request and displays decoded text', async () => {
  const h = screen(); await h.send()
  assert.equal(h.requests.length, 1)
  assert.deepEqual(JSON.parse(h.requests[0].options.body), { message: 'Question actuelle' })
  assert.equal(h.requests[0].options.headers.Accept, 'text/event-stream')
  assert.equal(h.requests[0].options.headers.Authorization, 'Bearer fixture-only-token')
  assert.equal(h.state.messages.at(-1).content, 'Réponse vérifiée')
  assert.equal(h.context.caseRef.current, CASE)
  assert.equal(h.state.loading, false)
})

test('a follow-up mobile message reuses the same dossier', async () => {
  const h = screen(); await h.send()
  h.context.input = 'Question suivante'; await h.send()
  assert.deepEqual(JSON.parse(h.requests[1].options.body), { message: 'Question suivante', caseId: CASE })
})

test('two immediate send presses cannot duplicate a pending request', async () => {
  const session = deferred(), h = screen({ session })
  const first = h.send(), second = h.send()
  session.resolve({ data: { session: { access_token: 'fixture-only-token', user: { id: 'owner-a' } } } })
  await Promise.all([first, second])
  assert.equal(h.requests.length, 1)
  assert.equal(h.state.messages.filter(message => message.role === 'user').length, 1)
})

test('a changed account during token lookup cannot send the old question', async () => {
  const session = deferred(), h = screen({ session }), task = h.send()
  h.auth.ownerId = 'owner-b'
  session.resolve({ data: { session: { access_token: 'fixture-only-token', user: { id: 'owner-b' } } } })
  await task
  assert.equal(h.requests.length, 0)
})

test('a token belonging to a different account is rejected before POST', async () => {
  const h = screen({ tokenOwner: 'owner-b' }); await h.send()
  assert.equal(h.requests.length, 0)
})

test('unmount cancellation discards a late successful POST', async () => {
  const pending = deferred(), h = screen({ fetchImpl: () => pending.promise }), task = h.send()
  await tick(); h.cancel(); const before = JSON.stringify(h.state)
  pending.resolve(response()); await task
  assert.equal(JSON.stringify(h.state), before)
})

test('an interrupted stream keeps partial text and exposes its failure', async () => {
  const h = screen({ fetchImpl: () => Promise.resolve(response([{ type: 'text', content: 'Réponse partielle' }])) })
  await h.send()
  assert.equal(h.state.messages.at(-1).content, 'Réponse partielle')
  assert.match(h.state.error, /interrompue/)
  assert.equal(h.state.loading, false)
})

test('oversized messages do not reach the transport', async () => {
  const h = screen(); h.context.input = 'a'.repeat(8001); await h.send()
  assert.equal(h.requests.length, 0)
})

test('explicit stop releases the loading state and ignores a late response', async () => {
  const pending = deferred(), h = screen({ fetchImpl: () => pending.promise }), task = h.send()
  await tick(); h.stop()
  assert.equal(h.requests[0].options.signal.aborted, true)
  assert.equal(h.state.loading, false)
  assert.equal(h.state.messages.some(message => message.pending), false)
  const before = JSON.stringify(h.state)
  pending.resolve(response()); await task
  assert.equal(JSON.stringify(h.state), before)
  assert.equal(h.timers.size, 0)
})

test('a stalled request has a finite deadline without confirming any response', async () => {
  const pending = deferred(), h = screen({ fetchImpl: () => pending.promise }), task = h.send()
  await tick()
  assert.equal(h.timers.size, 1)
  const timer = [...h.timers.values()][0]
  assert.equal(timer.delay, 130_000)
  timer.fn()
  assert.equal(h.state.loading, false)
  assert.match(h.state.error, /délai/)
  assert.equal(h.requests[0].options.signal.aborted, true)
  const before = JSON.stringify(h.state)
  pending.resolve(response()); await task
  assert.equal(JSON.stringify(h.state), before)
})

test('an old cancelled request cannot stop a new request or clear its loading state', async () => {
  const pending = [deferred(), deferred()]
  let index = 0
  const h = screen({ fetchImpl: () => pending[index++].promise })
  const first = h.send(); await tick()
  const oldTimer = [...h.timers.values()][0]
  h.stop(); h.context.input = 'Nouvelle question'
  const second = h.send(); await tick()
  oldTimer.fn()
  assert.equal(h.requests[1].options.signal.aborted, false)
  pending[0].resolve(response()); await first
  assert.equal(h.state.loading, true)
  pending[1].resolve(response()); await second
  assert.equal(h.state.loading, false)
  assert.equal(h.state.messages.at(-1).content, 'Réponse vérifiée')
})

function request(fetchImpl, overrides = {}) {
  const events = [], calls = []
  const { sendChatMessage } = chatModule((...args) => { calls.push(args); return fetchImpl(...args) })
  return { events, calls, run: () => sendChatMessage({ message: 'Question', caseId: null,
    accessToken: 'fixture-token', signal: new AbortController().signal, onEvent: event => events.push(event), ...overrides }) }
}

test('native transport reuses the shared decoder across individual UTF-8 bytes', async () => {
  const h = request(() => Promise.resolve(response(undefined, { split: true }))); await h.run()
  assert.deepEqual(normalize(h.events), [
    { type: 'case_created', caseId: CASE }, { type: 'text', content: 'Réponse vérifiée' }, { type: 'done', caseId: CASE },
  ])
})

test('a confirmed terminal message settles without waiting for HTTP close', async () => {
  const h = request(() => Promise.resolve(response(undefined, { close: false })))
  await h.run(); assert.equal(h.events.at(-1).type, 'done')
})

for (const status of [401, 402, 429, 500]) {
  test(`HTTP ${status} cannot be presented as an assistant response`, async () => {
    const h = request(() => Promise.resolve(Response.json({ error: 'Limite du dossier atteinte.' }, { status })))
    await assert.rejects(h.run())
    assert.deepEqual(h.events, [])
  })
}

test('a server persistence failure is not converted into completion', async () => {
  const h = request(() => Promise.resolve(response([
    { type: 'text', content: 'Texte provisoire' }, { type: 'error', error: 'Enregistrement non confirmé.' },
  ])))
  await assert.rejects(h.run(), /Enregistrement non confirmé/)
  assert.deepEqual(normalize(h.events), [{ type: 'text', content: 'Texte provisoire' }])
})

for (const event of [{ type: 'done' }, { type: 'done', caseId: OTHER_CASE }, { type: 'text', content: 42 }, { type: 'unexpected' }, null]) {
  test(`reject a malformed or unrelated event ${JSON.stringify(event)}`, async () => {
    const h = request(() => Promise.resolve(response([event])), { caseId: CASE })
    await assert.rejects(h.run())
    assert.deepEqual(h.events, [])
  })
}

test('HTML or a normal JSON response cannot appear as SSE chat text', async () => {
  const h = request(() => Promise.resolve(Response.json({ message: 'wrong transport' })))
  await assert.rejects(h.run(), /invalide/)
  assert.deepEqual(h.events, [])
})

test('an already aborted request makes no network call', async () => {
  const controller = new AbortController(); controller.abort()
  const h = request(() => assert.fail('unexpected POST'), { signal: controller.signal })
  await h.run(); assert.equal(h.calls.length, 0)
})

for (const overrides of [{ message: '' }, { message: 'a'.repeat(8001) }, { accessToken: '' }, { caseId: 'not-a-uuid' }]) {
  test(`invalid mobile request rejected locally: ${Object.keys(overrides).join(',')}`, async () => {
    const h = request(() => assert.fail('unexpected POST'), overrides)
    await assert.rejects(h.run()); assert.equal(h.calls.length, 0)
  })
}

const RECOVERY_ERROR = 'Le dossier est créé, mais l’enregistrement du message n’a pas été confirmé.'

test('mobile keeps the failed first message visible and explicitly reuses its confirmed dossier', async () => {
  let count = 0
  const h = screen({ fetchImpl: () => Promise.resolve(count++ === 0
    ? Response.json({ error: RECOVERY_ERROR, caseId: CASE }, { status: 500 })
    : response([{ type: 'text', content: 'Reprise confirmée' }, { type: 'done', caseId: CASE }])) })
  await h.send()
  assert.equal(h.requests.length, 1)
  assert.equal(h.context.caseRef.current, CASE)
  assert.equal(h.state.error, RECOVERY_ERROR)
  assert.equal(h.state.loading, false)
  h.context.input = 'Reprise explicite'
  await h.send()
  assert.deepEqual(JSON.parse(h.requests[1].options.body), { message: 'Reprise explicite', caseId: CASE })
  assert.equal(h.state.messages.at(-1).content, 'Reprise confirmée')
})

for (const value of ['invalid', '//example.invalid', 42, null]) {
  test(`mobile refuses an invalid HTTP recovery identity ${JSON.stringify(value)}`, async () => {
    const h = request(() => Promise.resolve(Response.json({ error: RECOVERY_ERROR, caseId: value }, { status: 500 })))
    await assert.rejects(h.run(), /confirmé/)
    assert.deepEqual(h.events, [])
  })
}

test('mobile cannot replace an existing conversation using an HTTP error identity', async () => {
  const h = request(() => Promise.resolve(Response.json({ error: RECOVERY_ERROR, caseId: OTHER_CASE }, { status: 500 })), { caseId: CASE })
  await assert.rejects(h.run(), /confirmé/)
  assert.deepEqual(h.events, [])
})

test('mobile cancellation during error JSON parsing discards a late recovery identity', async () => {
  const body = deferred(), controller = new AbortController()
  const h = request(() => Promise.resolve({ ok: false, status: 500, json: () => body.promise }), { signal: controller.signal })
  const task = h.run()
  await tick()
  controller.abort()
  body.resolve({ error: RECOVERY_ERROR, caseId: CASE })
  await task
  assert.deepEqual(h.events, [])
})
