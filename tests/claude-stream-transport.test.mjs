import { afterEach, beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire, registerHooks } from 'node:module'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const dependencyRequire = createRequire(process.env.JURIS_TEST_DEPENDENCY_ROOT
  ? pathToFileURL(resolve(process.env.JURIS_TEST_DEPENDENCY_ROOT, 'package.json'))
  : new URL('../package.json', import.meta.url))
const anthropicUrl = pathToFileURL(dependencyRequire.resolve('@anthropic-ai/sdk')).href
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === '@anthropic-ai/sdk') return { url: anthropicUrl, shortCircuit: true }
    if (specifier === '@purama/smarana') return { url: 'juris-stream-test:smarana', shortCircuit: true }
    return nextResolve(specifier, context)
  },
  load(url, context, nextLoad) {
    if (url === 'juris-stream-test:smarana') return {
      format: 'module', shortCircuit: true,
      source: 'export const smarana = { ask: () => { throw new Error("Streaming must not call the non-streaming boundary") } }',
    }
    return nextLoad(url, context)
  },
})
const { streamClaude } = await import('../src/lib/claude.ts')
const originalFetch = globalThis.fetch
const oldKey = process.env.ANTHROPIC_API_KEY
const encoder = new TextEncoder()
let state
const message = {
  id: 'msg_synthetic', type: 'message', role: 'assistant', model: 'claude-sonnet-4-20250514',
  content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 1, output_tokens: 0 },
}
const firstEvents = [
  { type: 'message_start', message },
  { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } },
  { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'Bonjour.' } },
]
const finalEvents = [
  { type: 'content_block_stop', index: 0 },
  { type: 'message_delta', delta: { stop_reason: 'end_turn', stop_sequence: null }, usage: { output_tokens: 1 } },
  { type: 'message_stop' },
]
const frame = event => `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`
beforeEach(() => {
  state = {
    mode: 'complete', calls: [], aborted: 0, bodyCancelled: 0,
    started: Promise.withResolvers(), abortObserved: Promise.withResolvers(), cleanup: () => {},
  }
  process.env.ANTHROPIC_API_KEY = 'synthetic-anthropic-key'
  globalThis.fetch = async (input, init) => {
    const url = new URL(typeof input === 'string' ? input : input.url)
    assert.equal(url.origin, 'https://api.anthropic.com')
    assert.equal(url.pathname, '/v1/messages')
    state.calls.push({ body: JSON.parse(init.body), signal: init.signal })
    state.started.resolve()
    if (state.mode === 'pending') return new Promise((resolveFetch, rejectFetch) => {
      const abort = () => {
        state.aborted++
        state.abortObserved.resolve()
        rejectFetch(new DOMException('Synthetic fetch aborted', 'AbortError'))
      }
      state.cleanup = () => init.signal.removeEventListener('abort', abort)
      if (init.signal.aborted) abort()
      else init.signal.addEventListener('abort', abort, { once: true })
    })
    let closed = false
    const body = new ReadableStream({
      start(controller) {
        const abort = () => {
          if (closed) return
          closed = true
          state.aborted++
          controller.error(new DOMException('Synthetic body aborted', 'AbortError'))
          state.abortObserved.resolve()
        }
        state.cleanup = () => init.signal.removeEventListener('abort', abort)
        init.signal.addEventListener('abort', abort, { once: true })
        controller.enqueue(encoder.encode(firstEvents.map(frame).join('')))
        if (state.mode === 'complete') {
          controller.enqueue(encoder.encode(finalEvents.map(frame).join('')))
          closed = true
          controller.close()
          state.cleanup()
        }
      },
      cancel() { closed = true; state.bodyCancelled++; state.cleanup() },
    })
    return new Response(body, { headers: { 'Content-Type': 'text/event-stream', 'Request-Id': 'req_synthetic' } })
  }
})
afterEach(() => {
  state.cleanup()
  globalThis.fetch = originalFetch
  if (oldKey === undefined) delete process.env.ANTHROPIC_API_KEY
  else process.env.ANTHROPIC_API_KEY = oldKey
})
const options = signal => ({ messages: [{ role: 'user', content: 'Bonjour' }], system: 'Fixture', signal })
const aborted = error => error instanceof Error && /abort/i.test(error.message)

test('the installed Anthropic SDK preserves the normal stream and existing request payload', async () => {
  const abort = new AbortController()
  const result = await Array.fromAsync(streamClaude(options(abort.signal)))
  assert.deepEqual(result, ['Bonjour.'])
  assert.equal(state.calls.length, 1)
  assert.equal(state.calls[0].body.stream, true)
  assert.deepEqual(state.calls[0].body.messages, [{ role: 'user', content: 'Bonjour' }])
  assert.equal(state.calls[0].body.max_tokens, 4096)
  assert.equal(state.calls[0].signal.aborted, false)
  assert.equal(state.aborted, 0)
})

test('pre-aborted work never starts an SDK request', async () => {
  const abort = new AbortController()
  abort.abort()
  await assert.rejects(streamClaude(options(abort.signal)).next(), aborted)
  assert.deepEqual(state.calls, [])
})

test('request signal aborts a pending SDK fetch without retry', { timeout: 2000 }, async () => {
  state.mode = 'pending'
  const abort = new AbortController()
  const read = streamClaude(options(abort.signal)).next()
  await state.started.promise
  abort.abort()
  await assert.rejects(read, aborted)
  await state.abortObserved.promise
  assert.equal(state.calls.length, 1)
  assert.equal(state.calls[0].signal.aborted, true)
})

test('early generator return aborts the actual SDK response transport', { timeout: 2000 }, async () => {
  state.mode = 'open'
  const iterator = streamClaude(options(new AbortController().signal))
  assert.deepEqual(await iterator.next(), { value: 'Bonjour.', done: false })
  assert.deepEqual(await iterator.return(), { value: undefined, done: true })
  await state.abortObserved.promise
  assert.equal(state.calls[0].signal.aborted, true)
  assert.equal(state.calls.length, 1)
})

test('abort during the SDK response stops subsequent chunks and drains its reader', { timeout: 2000 }, async () => {
  state.mode = 'open'
  const abort = new AbortController()
  const iterator = streamClaude(options(abort.signal))
  assert.equal((await iterator.next()).value, 'Bonjour.')
  const read = iterator.next()
  abort.abort()
  await assert.rejects(read, aborted)
  await state.abortObserved.promise
  assert.equal(state.calls.length, 1)
  assert.equal(state.calls[0].signal.aborted, true)
})
