import assert from 'node:assert/strict'
import { test } from 'node:test'
import { callback, deferred, flush } from './lifecycle-source.mjs'

function harness(hash) {
  const file = 'src/app/(dashboard)/documents/[id]/page.tsx'
  const requests = [], errors = [], replaced = [], history = []
  const state = { doc: null, caseRow: null, signOpen: false, sendOpen: false, loading: true }
  const context = {
    id: 'document-test', AbortController, requestRef: { current: null },
    router: { replace: path => replaced.push(path) },
    window: {
      location: { hash, pathname: '/documents/document-test', search: '?source=test' },
      history: { replaceState: (...args) => history.push(args) },
    },
    setDoc: value => { state.doc = value }, setCaseRow: value => { state.caseRow = value },
    setSignOpen: value => { state.signOpen = value }, setSendOpen: value => { state.sendOpen = value },
    setLoading: value => { state.loading = value }, toast: { error: value => errors.push(value) },
    fetch: (url, options) => {
      const pending = deferred()
      requests.push({ url, options, ...pending })
      return pending.promise
    },
  }
  const load = callback(file, 'refetch', context)
  let task
  context.refetch = () => { task = load(); return task }
  const effect = callback(file, 'effect', context)
  return { state, requests, errors, replaced, history, load,
    mount: () => ({ cleanup: effect(), task }) }
}

for (const [hash, status, expected] of [
  ['#sign', 'pending', 'signOpen'], ['#sign', 'signed', null],
  ['#send-email', 'signed', 'sendOpen'], ['#send-recommande', 'signed', 'sendOpen'],
  ['', 'pending', null],
]) {
  test(`document deep link ${hash || '(none)'} with ${status} status opens only its intended modal`, async () => {
    const h = harness(hash), mounted = h.mount()
    assert.equal(h.requests[0].url, '/api/documents/document-test')
    assert.equal(h.state.signOpen || h.state.sendOpen, false)
    h.requests[0].resolve({ ok: true, json: async () => ({ document: { id: 'document-test', signature_status: status }, case: { id: 'case-test' } }) })
    await mounted.task
    assert.equal(h.state.signOpen, expected === 'signOpen')
    assert.equal(h.state.sendOpen, expected === 'sendOpen')
    assert.equal(h.state.loading, false)
    assert.deepEqual(h.history, hash ? [[null, '', '/documents/document-test?source=test']] : [])
  })
}

test('a late 404 cannot redirect after leaving the document', async () => {
  const h = harness('#sign'), mounted = h.mount()
  mounted.cleanup()
  assert.equal(h.requests[0].options.signal.aborted, true)
  h.requests[0].resolve({ ok: false, status: 404 }); await mounted.task
  assert.deepEqual(h.errors, [])
  assert.deepEqual(h.replaced, [])
})

test('the current 404 keeps the existing missing-document message and redirect', async () => {
  const h = harness(''), mounted = h.mount()
  h.requests[0].resolve({ ok: false, status: 404 }); await mounted.task
  assert.deepEqual(h.errors, ['Document introuvable.'])
  assert.deepEqual(h.replaced, ['/documents'])
  assert.equal(h.state.loading, false)
})

test('late decoded data cannot reopen a modal after navigation or overwrite a refresh', async () => {
  const h = harness('#sign'), body = deferred(), mounted = h.mount()
  h.requests[0].resolve({ ok: true, json: () => body.promise }); await flush()
  const current = h.load()
  h.requests[1].resolve({ ok: true, json: async () => ({ document: { id: 'current', signature_status: 'signed' }, case: { id: 'case-test' } }) })
  await current
  mounted.cleanup()
  body.resolve({ document: { id: 'old', signature_status: 'pending' }, case: { id: 'old-case' } })
  await mounted.task
  assert.equal(h.state.doc.id, 'current')
  assert.equal(h.state.signOpen, false)
})
