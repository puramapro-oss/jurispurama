import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import ts from 'typescript'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const file = 'src/app/(dashboard)/financer/page.tsx'
const baseRef = process.env.JURIS_FINANCER_TEST_BASE_REF
if (baseRef && !/^[a-f0-9]{40}$/.test(baseRef)) throw new Error('Expected a full Git commit SHA')
const text = baseRef
  ? execFileSync('git', ['show', `${baseRef}:${file}`], { cwd: root, encoding: 'utf8' })
  : readFileSync(resolve(root, file), 'utf8')
const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
const compiled = new Map()

function compile(name) {
  if (compiled.has(name)) return compiled.get(name)
  let selected
  function visit(node) {
    if (name === 'effect' && ts.isCallExpression(node) && node.expression.getText(source) === 'useEffect') {
      selected ??= node.arguments[0]
    } else if (ts.isVariableDeclaration(node) && node.name.getText(source) === name && node.initializer) {
      selected = ts.isCallExpression(node.initializer) ? node.initializer.arguments[0] : node.initializer
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  assert.ok(selected, `The actual ${name} must exist`)
  const code = ts.transpileModule(`globalThis.selected = ${selected.getText(source)}`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText
  compiled.set(name, code)
  return code
}

function deferred() {
  let resolvePromise, reject
  const promise = new Promise((resolve, rejectPromise) => { resolvePromise = resolve; reject = rejectPromise })
  return { promise, resolve: resolvePromise, reject }
}

function harness() {
  const state = { aides: [], loading: false, selectedAides: new Set() }
  const requests = [], errors = [], updates = []
  const requestRef = { current: null }
  function render(parameters) {
    const context = {
      ...parameters, URLSearchParams, AbortController, requestRef,
      fetch: (url, options = {}) => {
        const task = deferred()
        requests.push({ url, options, ...task })
        return task.promise
      },
      setAides: aides => { state.aides = aides; updates.push('aides') },
      setLoading: loading => { state.loading = loading; updates.push('loading') },
      setSelectedAides: update => { state.selectedAides = update(state.selectedAides) },
      toast: { error: message => errors.push(message) },
    }
    function evaluate(name) { vm.runInNewContext(compile(name), context); return context.selected }
    const read = evaluate('fetchAides')
    let lastTask
    context.fetchAides = () => { lastTask = read(); return lastTask }
    const effect = evaluate('effect')
    return { read: context.fetchAides, effect: () => ({ cleanup: effect(), task: lastTask }),
      toggleAide: evaluate('toggleAide') }
  }
  const response = id => ({ ok: true, json: async () => ({ aides: [{ id }] }) })
  return { state, requests, errors, updates, render, response }
}

const active = { step: 2, profil: 'salarie', situation: 'litige' }
const flush = async () => { await Promise.resolve(); await Promise.resolve() }

for (const parameters of [
  { ...active, step: 1 }, { ...active, step: 3 }, { ...active, step: 4 },
  { step: 2, profil: '', situation: '' },
]) {
  test(`does not fetch outside the existing gate: ${JSON.stringify(parameters)}`, () => {
    const h = harness(), mounted = h.render(parameters).effect()
    assert.equal(mounted.task, undefined)
    assert.equal(h.requests.length, 0)
    assert.equal(h.state.loading, false)
  })
}

for (const parameters of [active, { ...active, profil: '' }, { ...active, situation: '' }]) {
  test(`preserves GET parameters and completes the current read: ${JSON.stringify(parameters)}`, async () => {
    const h = harness(), mounted = h.render(parameters).effect(), request = h.requests[0]
    const url = new URL(request.url, 'https://fixture.invalid')
    assert.equal(url.pathname, '/api/financer')
    assert.deepEqual(Object.fromEntries(url.searchParams), Object.fromEntries(
      Object.entries(parameters).filter(([key, value]) => key !== 'step' && value)))
    assert.equal(request.options.method ?? 'GET', 'GET')
    assert.equal(request.options.body, undefined)
    assert.equal(h.state.loading, true)
    request.resolve(h.response('current')); await mounted.task
    assert.equal(h.state.aides[0].id, 'current')
    assert.equal(h.state.loading, false)
  })
}

for (const change of [{ profil: 'independant' }, { situation: 'recours' }]) {
  test(`an obsolete response cannot overwrite a changed ${Object.keys(change)[0]}`, async () => {
    const h = harness(), old = h.render(active).read(), current = h.render({ ...active, ...change }).read()
    h.requests[1].resolve(h.response('current')); await current
    h.requests[0].resolve(h.response('obsolete')); await old
    assert.equal(h.state.aides[0].id, 'current')
    assert.deepEqual(h.errors, [])
  })
}

test('a cancelled request cannot clear active loading or show an obsolete error', async () => {
  const h = harness(), old = h.render(active).read(), current = h.render({ ...active, profil: 'autre' }).read()
  h.requests[0].reject(new Error('cancelled transport')); await old
  assert.equal(h.state.loading, true)
  assert.deepEqual(h.errors, [])
  h.requests[1].resolve(h.response('current')); await current
  assert.equal(h.state.loading, false)
})

test('an old JSON body is ignored even when transport completed before cancellation', async () => {
  const h = harness(), body = deferred(), old = h.render(active).read()
  h.requests[0].resolve({ ok: true, json: () => body.promise }); await flush()
  const current = h.render({ ...active, situation: 'autre' }).read()
  h.requests[1].resolve(h.response('current')); await current
  body.resolve({ aides: [{ id: 'obsolete' }] }); await old
  assert.equal(h.state.aides[0].id, 'current')
})

test('leaving step two aborts the read and returning starts a fresh one', async () => {
  const h = harness(), mounted = h.render(active).effect()
  assert.equal(typeof mounted.cleanup, 'function')
  mounted.cleanup()
  assert.equal(h.requests[0].options.signal.aborted, true)
  assert.equal(h.render({ ...active, step: 3 }).effect().task, undefined)
  h.requests[0].reject(new Error('cancelled transport')); await mounted.task
  assert.deepEqual(h.errors, [])
  const returned = h.render(active).effect()
  assert.equal(h.requests.length, 2)
  h.requests[1].resolve(h.response('after-return')); await returned.task
  assert.equal(h.state.aides[0].id, 'after-return')
  assert.equal(h.state.loading, false)
})

test('unmount cleanup prevents late decoding from updating state', async () => {
  const h = harness(), body = deferred(), mounted = h.render(active).effect()
  h.requests[0].resolve({ ok: true, json: () => body.promise }); await flush()
  assert.equal(typeof mounted.cleanup, 'function')
  mounted.cleanup()
  const updateCount = h.updates.length
  body.resolve({ aides: [{ id: 'after-unmount' }] }); await mounted.task
  assert.equal(h.updates.length, updateCount)
  assert.deepEqual(h.state.aides, [])
  assert.deepEqual(h.errors, [])
})

for (const mode of ['network', 'http']) {
  test(`a current ${mode} failure preserves the French message and ends loading`, async () => {
    const h = harness(), task = h.render(active).read()
    if (mode === 'network') h.requests[0].reject(new Error('private transport detail'))
    else h.requests[0].resolve({ ok: false })
    await task
    assert.deepEqual(h.errors, ['Impossible de charger les aides.'])
    assert.equal(h.state.loading, false)
  })
}

test('an absent list remains an empty result', async () => {
  const h = harness(), task = h.render(active).read()
  h.requests[0].resolve({ ok: true, json: async () => ({}) }); await task
  assert.deepEqual(Array.from(h.state.aides), [])
  assert.equal(h.state.loading, false)
})

test('reading aids preserves the existing selection and toggle behavior', async () => {
  const h = harness(), view = h.render(active)
  view.toggleAide('aide-1'); view.toggleAide('aide-2'); view.toggleAide('aide-1')
  const task = view.read()
  h.requests[0].resolve(h.response('aide-2')); await task
  assert.deepEqual(Array.from(h.state.selectedAides), ['aide-2'])
})
