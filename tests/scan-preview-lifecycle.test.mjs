import assert from 'node:assert/strict'
import { test } from 'node:test'
import { callback, deferred, flush } from './lifecycle-source.mjs'

const baseRef = process.env.JURIS_SCAN_TEST_BASE_REF

function harness() {
  const source = 'src/hooks/useScanAnalysis.ts'
  const created = [], revoked = [], errors = [], successes = [], requests = []
  const state = { file: null, preview: null, result: null, context: '', step: 3, analyzing: false }
  const context = {
    previewRef: { current: null }, analysisRef: { current: null }, FormData, AbortController,
    URL: {
      createObjectURL: file => { const url = `blob:fixture-${created.length}`; created.push({ file, url }); return url },
      revokeObjectURL: url => revoked.push(url),
    },
    setSelectedFile: value => { state.file = value }, setPreviewUrl: value => { state.preview = value },
    setContext: value => { state.context = value }, setResult: value => { state.result = value },
    setStepIdx: value => { state.step = value }, setAnalyzing: value => { state.analyzing = value },
    toast: { error: value => errors.push(value), success: value => successes.push(value) },
    fetch: (url, options) => { const pending = deferred(); requests.push({ url, options, ...pending }); return pending.promise },
  }
  const setFile = callback(source, 'setFile', context, baseRef)
  context.setFile = setFile
  const cleanup = callback(source, 'effect', context, baseRef)()
  return { state, created, revoked, errors, successes, requests, setFile, cleanup,
    reset: callback(source, 'resetAll', context, baseRef),
    analyze: () => callback(source, 'analyze', { ...context, file: state.file, context: state.context }, baseRef)() }
}

test('successive image selections release the previous URL even before a React render', () => {
  const h = harness(), a = new File(['a'], 'a.png', { type: 'image/png' }), b = new File(['b'], 'b.jpg', { type: 'image/jpeg' })
  h.setFile(a); h.setFile(b)
  assert.equal(h.state.file, b)
  assert.equal(h.state.preview, 'blob:fixture-1')
  assert.deepEqual(h.revoked, ['blob:fixture-0'])
  h.cleanup()
  assert.deepEqual(h.revoked, ['blob:fixture-0', 'blob:fixture-1'])
})

test('selecting a PDF removes the old image preview without creating another URL', () => {
  const h = harness()
  h.setFile(new File(['a'], 'a.png', { type: 'image/png' }))
  h.setFile(new File(['pdf'], 'a.pdf', { type: 'application/pdf' }))
  assert.equal(h.state.preview, null)
  assert.equal(h.created.length, 1)
  assert.deepEqual(h.revoked, ['blob:fixture-0'])
  h.cleanup()
  assert.equal(h.revoked.length, 1)
})

test('reset clears file, preview, analysis and context while releasing its URL', () => {
  const h = harness()
  h.setFile(new File(['a'], 'a.png', { type: 'image/png' }))
  h.state.result = { summary: 'fixture' }; h.state.context = 'fixture'
  h.reset()
  assert.equal(h.state.file, null)
  assert.equal(h.state.preview, null)
  assert.equal(h.state.result, null)
  assert.equal(h.state.context, '')
  assert.deepEqual(h.revoked, ['blob:fixture-0'])
})

test('each analysis starts at its first step and preserves the OCR request contract', async () => {
  const h = harness(), file = new File(['pdf'], 'fixture.pdf', { type: 'application/pdf' })
  h.setFile(file); h.state.context = '  contexte de test  '
  const task = h.analyze(), request = h.requests[0]
  assert.equal(h.state.step, 0)
  assert.equal(h.state.analyzing, true)
  assert.equal(request.url, '/api/ocr')
  assert.equal(request.options.method, 'POST')
  assert.equal(request.options.body.get('file'), file)
  assert.equal(request.options.body.get('context'), 'contexte de test')
  request.resolve({ ok: true, json: async () => ({ summary: 'Résultat synthétique' }) }); await task
  assert.equal(h.state.result.summary, 'Résultat synthétique')
  assert.equal(h.state.analyzing, false)
  assert.deepEqual(h.errors, [])
})

for (const action of ['reset', 'select', 'unmount']) {
  for (const phase of ['transport', 'json']) {
    test(`${action} cancels analysis during ${phase} and ignores its late result`, async () => {
      const h = harness(), body = deferred()
      h.setFile(new File(['pdf'], 'a.pdf', { type: 'application/pdf' }))
      const task = h.analyze(), request = h.requests[0]
      if (phase === 'json') {
        request.resolve({ ok: true, json: () => body.promise })
        await flush()
      }
      if (action === 'reset') h.reset()
      else if (action === 'select') h.setFile(new File(['b'], 'b.pdf', { type: 'application/pdf' }))
      else h.cleanup()
      assert.equal(request.options.signal?.aborted, true)
      const before = JSON.stringify(h.state)
      if (phase === 'transport') request.resolve({ ok: true, json: async () => ({ summary: 'obsolete' }) })
      else body.resolve({ summary: 'obsolete' })
      await task
      assert.equal(JSON.stringify(h.state), before)
      assert.equal(h.state.result, null)
      assert.deepEqual(h.successes, [])
      assert.deepEqual(h.errors, [])
    })
  }
}

test('an older analysis cannot clear loading or replace the current file result', async () => {
  const h = harness()
  h.setFile(new File(['a'], 'a.pdf', { type: 'application/pdf' }))
  const old = h.analyze()
  h.setFile(new File(['b'], 'b.pdf', { type: 'application/pdf' }))
  const current = h.analyze()
  h.requests[0].reject(new Error('obsolete error')); await old
  assert.equal(h.state.analyzing, true)
  assert.deepEqual(h.errors, [])
  h.requests[1].resolve({ ok: true, json: async () => ({ summary: 'current' }) }); await current
  assert.equal(h.state.analyzing, false)
  assert.equal(h.state.result.summary, 'current')
})
