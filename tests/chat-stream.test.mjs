import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import ts from 'typescript'

const source = readFileSync(new URL('../src/lib/chat-stream.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText
const { readChatStream } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)
const encode = value => new TextEncoder().encode(value)

test('the actual reader preserves split UTF-8 text and the existing SSE events', async () => {
  const text = 'data: {"type":"case_created","caseId":"case-1"}\n\ndata: {"type":"text","content":"Échéance à vérifier"}\n\ndata: {"type":"done","meta":{"next_actions":["generate_document"]}}\n\ndata: [DONE]\n\n'
  const bytes = encode(text), received = []
  const body = new ReadableStream({ start(controller) {
    for (let offset = 0; offset < bytes.length; offset += 3) controller.enqueue(bytes.slice(offset, offset + 3))
    controller.close()
  } })
  await readChatStream(body, new AbortController().signal, event => received.push(event))
  assert.deepEqual(received, [
    { type: 'case_created', caseId: 'case-1' },
    { type: 'text', content: 'Échéance à vérifier' },
    { type: 'done', meta: { next_actions: ['generate_document'] } },
  ])
  assert.equal(body.locked, false)
})

test('an already-aborted scope cancels and releases the body without observing an event', async () => {
  let cancellations = 0
  const body = new ReadableStream({ cancel() { cancellations++ } })
  const controller = new AbortController(); controller.abort()
  await assert.rejects(readChatStream(body, controller.signal, () => assert.fail('obsolete event')), { name: 'AbortError' })
  assert.equal(cancellations, 1)
  assert.equal(body.locked, false)
})

test('aborting a pending native read settles it and releases its reader', async () => {
  let cancellations = 0
  const body = new ReadableStream({ cancel() { cancellations++ } })
  const controller = new AbortController()
  const task = readChatStream(body, controller.signal, () => assert.fail('obsolete event'))
  assert.equal(body.locked, true)
  controller.abort()
  await assert.rejects(task, { name: 'AbortError' })
  assert.equal(cancellations, 1)
  assert.equal(body.locked, false)
})

test('aborting from an event handler prevents the next event in the same chunk', async () => {
  let cancellations = 0
  const controller = new AbortController(), received = []
  const body = new ReadableStream({
    start(stream) { stream.enqueue(encode('data: {"type":"text","content":"first"}\n\ndata: {"type":"text","content":"obsolete"}\n\n')) },
    cancel() { cancellations++ },
  })
  await assert.rejects(readChatStream(body, controller.signal, event => { received.push(event.content); controller.abort() }), { name: 'AbortError' })
  assert.deepEqual(received, ['first'])
  assert.equal(cancellations, 1)
  assert.equal(body.locked, false)
})

test('a handler error cancels remaining stream data and keeps the original error', async () => {
  let cancellations = 0
  const failure = new Error('Server-reported failure')
  const body = new ReadableStream({
    start(stream) { stream.enqueue(encode('data: {"type":"error","error":"Server-reported failure"}\n\n')) },
    cancel() { cancellations++ },
  })
  await assert.rejects(readChatStream(body, new AbortController().signal, () => { throw failure }), error => error === failure)
  assert.equal(cancellations, 1)
  assert.equal(body.locked, false)
})

test('invalid event JSON rejects and releases the stream', async () => {
  let cancellations = 0
  const body = new ReadableStream({
    start(stream) { stream.enqueue(encode('data: {invalid json}\n\n')) },
    cancel() { cancellations++ },
  })
  await assert.rejects(readChatStream(body, new AbortController().signal, () => assert.fail('invalid event')), SyntaxError)
  assert.equal(cancellations, 1)
  assert.equal(body.locked, false)
})

test('transport read failures retain their error and release the reader', async () => {
  const failure = new Error('Synthetic connection failure')
  const body = new ReadableStream({ start(controller) { controller.error(failure) } })
  await assert.rejects(readChatStream(body, new AbortController().signal, () => assert.fail('failed stream event')), error => error === failure)
  assert.equal(body.locked, false)
})

test('a failing cancellation does not replace the abort result or leak a rejection', async () => {
  const controller = new AbortController()
  const body = new ReadableStream({ cancel() { return Promise.reject(new Error('Cancellation transport failure')) } })
  const task = readChatStream(body, controller.signal, () => assert.fail('cancelled event'))
  controller.abort()
  await assert.rejects(task, { name: 'AbortError' })
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(body.locked, false)
})

test('EOF without the route terminal event is an explicit interrupted response', async () => {
  const received = []
  const body = new ReadableStream({ start(controller) {
    controller.enqueue(encode('data: {"type":"text","content":"Réponse partielle"}\n\ndata: [DONE]\n\n'))
    controller.close()
  } })
  await assert.rejects(readChatStream(body, new AbortController().signal, event => received.push(event)),
    { message: 'La réponse a été interrompue. Tu peux réessayer.' })
  assert.deepEqual(received, [{ type: 'text', content: 'Réponse partielle' }])
  assert.equal(body.locked, false)
})

test('a confirmed terminal event settles without waiting for the transport to close', async () => {
  let transport, cancellations = 0, settled = false
  const body = new ReadableStream({
    start(controller) { transport = controller; controller.enqueue(encode('data: {"type":"done"}\n\n')) },
    cancel() { cancellations++ },
  })
  const task = readChatStream(body, new AbortController().signal, () => undefined).then(() => { settled = true })
  try {
    await new Promise(resolve => setImmediate(resolve))
    assert.equal(settled, true)
    assert.equal(cancellations, 1)
    assert.equal(body.locked, false)
  } finally {
    if (!settled) transport.close()
    await task
  }
})
