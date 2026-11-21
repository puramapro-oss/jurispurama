import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import ts from 'typescript'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const baseRef = process.env.JURIS_ADMIN_TEST_BASE_REF
if (baseRef && !/^[a-f0-9]{40}$/.test(baseRef)) throw new Error('Expected a full Git commit SHA')
const compiled = new Map()

function compile(file, name) {
  const key = `${file}:${name}`
  if (compiled.has(key)) return compiled.get(key)
  const text = baseRef
    ? execFileSync('git', ['show', `${baseRef}:${file}`], { cwd: root, encoding: 'utf8' })
    : readFileSync(resolve(root, file), 'utf8')
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  let selected
  function visit(node) {
    if (name === 'effect' && ts.isCallExpression(node) && node.expression.getText(source) === 'useEffect') {
      selected ??= node.arguments[0]
    } else if (ts.isVariableDeclaration(node) && node.name.getText(source) === name &&
      node.initializer && ts.isCallExpression(node.initializer)) {
      selected = node.initializer.arguments[0]
    } else if (ts.isFunctionDeclaration(node) && node.name?.text === name) {
      selected = node
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  assert.ok(selected, `${file}: actual ${name} must exist`)
  const code = ts.transpileModule(`globalThis.selected = ${selected.getText(source)}`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText
  compiled.set(key, code)
  return code
}

function deferred() {
  let resolvePromise, reject
  const promise = new Promise((resolve, rejectPromise) => { resolvePromise = resolve; reject = rejectPromise })
  return { promise, resolve: resolvePromise, reject }
}

const specs = [
  { name: 'payments', setter: 'setPayments', key: 'payments', initial: { type: '', status: '' },
    current: { type: 'subscription', status: 'paid' }, query: { type: 'subscription', status: 'paid' },
    networkMessage: 'Impossible de charger les paiements. Réessaie.', httpMessage: 'Erreur de chargement' },
  { name: 'users', setter: 'setUsers', key: 'users', initial: { q: '', planFilter: '', page: 1 },
    current: { q: 'Éloïse + test', planFilter: 'pro', page: 3 }, query: { q: 'Éloïse + test', plan: 'pro', page: '3' },
    networkMessage: 'Impossible de charger les utilisateurs. Réessaie.', httpMessage: 'Accès administrateur requis.' },
]

function harness(spec) {
  const file = `src/app/(dashboard)/admin/${spec.name}/page.tsx`
  const state = { rows: [], loading: true, total: 0, updatingId: null }
  const requests = [], errors = [], successes = []
  const requestRef = { current: null }, loadRef = { current: null }
  const fetch = (url, options = {}) => {
    const task = deferred()
    requests.push({ url, options, ...task })
    return task.promise
  }
  function render(parameters) {
    const context = {
      ...parameters, URLSearchParams, AbortController, fetch, requestRef, loadRef,
      [spec.setter]: rows => { state.rows = rows },
      setLoading: loading => { state.loading = loading },
      setTotal: total => { state.total = total },
      setUpdatingId: id => { state.updatingId = id },
      toast: { error: value => errors.push(value), success: value => successes.push(value) },
    }
    function read(name) { vm.runInNewContext(compile(file, name), context); return context.selected }
    const actualLoad = read('load')
    let lastTask
    const load = () => { lastTask = actualLoad(); return lastTask }
    context.load = load
    const effect = read('effect')
    return { load, effect: () => ({ cleanup: effect(), task: lastTask }),
      updatePlan: spec.name === 'users' ? read('updatePlan') : undefined }
  }
  const response = (id, total = 1) => ({ ok: true, json: async () => ({ [spec.key]: [{ id }], total }) })
  return { render, response, requests, errors, successes, state }
}

const flush = async () => { await Promise.resolve(); await Promise.resolve() }

for (const spec of specs) {
  test(`${spec.name}: preserves filters and completes the current read`, async () => {
    const h = harness(spec), task = h.render(spec.current).load()
    const url = new URL(h.requests[0].url, 'https://fixture.invalid')
    assert.equal(url.pathname, `/api/admin/${spec.name}`)
    assert.deepEqual(Object.fromEntries(url.searchParams), spec.query)
    assert.equal(h.state.loading, true)
    h.requests[0].resolve(h.response('current', 4))
    await task
    assert.equal(h.state.rows[0].id, 'current')
    assert.equal(h.state.loading, false)
    if (spec.name === 'users') assert.equal(h.state.total, 4)
  })

  test(`${spec.name}: an obsolete response cannot overwrite the latest filter`, async () => {
    const h = harness(spec), old = h.render(spec.initial).load(), current = h.render(spec.current).load()
    h.requests[1].resolve(h.response('current', 2)); await current
    h.requests[0].resolve(h.response('obsolete', 99)); await old
    assert.equal(h.state.rows[0].id, 'current')
    if (spec.name === 'users') assert.equal(h.state.total, 2)
  })

  test(`${spec.name}: a cancelled read neither clears active loading nor reports an error`, async () => {
    const h = harness(spec), old = h.render(spec.initial).load(), current = h.render(spec.current).load()
    h.requests[0].reject(new Error('cancelled transport'))
    await assert.doesNotReject(old)
    assert.equal(h.state.loading, true)
    assert.deepEqual(h.errors, [])
    h.requests[1].resolve(h.response('current')); await current
    assert.equal(h.state.loading, false)
  })

  test(`${spec.name}: cancellation during JSON decoding suppresses late data`, async () => {
    const h = harness(spec), body = deferred(), old = h.render(spec.initial).load()
    h.requests[0].resolve({ ok: true, json: () => body.promise }); await flush()
    const current = h.render(spec.current).load()
    h.requests[1].resolve(h.response('current')); await current
    body.resolve({ [spec.key]: [{ id: 'obsolete' }], total: 99 }); await old
    assert.equal(h.state.rows[0].id, 'current')
  })

  test(`${spec.name}: a current network failure stops loading and shows a safe message`, async () => {
    const h = harness(spec), task = h.render(spec.initial).load()
    h.requests[0].reject(new Error('private transport detail'))
    await assert.doesNotReject(task)
    assert.deepEqual(h.errors, [spec.networkMessage])
    assert.equal(h.state.loading, false)
  })

  test(`${spec.name}: preserves the current HTTP error message`, async () => {
    const h = harness(spec), task = h.render(spec.initial).load()
    h.requests[0].resolve({ ok: false, json: async () => ({ error: 'Accès administrateur requis.' }) })
    await task
    assert.deepEqual(h.errors, [spec.httpMessage])
    assert.equal(h.state.loading, false)
  })

  test(`${spec.name}: effect cleanup aborts and ignores a late response`, async () => {
    const h = harness(spec), mounted = h.render(spec.initial).effect()
    assert.equal(typeof mounted.cleanup, 'function')
    mounted.cleanup()
    assert.equal(h.requests[0].options.signal.aborted, true)
    h.requests[0].resolve(h.response('after-unmount')); await mounted.task
    assert.deepEqual(h.state.rows, [])
    assert.deepEqual(h.errors, [])
  })
}

test('users: a plan update refreshes the current filters instead of its captured filters', async () => {
  const spec = specs[1], h = harness(spec), original = h.render(spec.initial), mounted = original.effect()
  h.requests[0].resolve(h.response('initial')); await mounted.task
  const mutation = original.updatePlan('user-42', 'pro'), patch = h.requests[1]
  assert.equal(patch.url, '/api/admin/users')
  assert.equal(patch.options.method, 'PATCH')
  assert.deepEqual(JSON.parse(patch.options.body), { userId: 'user-42', subscription_plan: 'pro' })
  mounted.cleanup?.()
  const current = h.render(spec.current).effect(), previousRead = h.requests[2]
  patch.resolve({ ok: true }); await flush()
  const refreshed = h.requests[3]
  assert.ok(refreshed)
  assert.deepEqual(Object.fromEntries(new URL(refreshed.url, 'https://fixture.invalid').searchParams), spec.query)
  refreshed.resolve(h.response('updated-current', 5)); await mutation
  previousRead.resolve(h.response('stale-before-mutation', 6)); await current.task
  assert.equal(h.state.rows[0].id, 'updated-current')
  assert.equal(h.state.total, 5)
  assert.deepEqual(h.successes, ['Plan mis à jour'])
  assert.equal(h.state.updatingId, null)
})

test('users: finishing a plan update after cleanup does not start a new read', async () => {
  const spec = specs[1], h = harness(spec), view = h.render(spec.initial), mounted = view.effect()
  h.requests[0].resolve(h.response('initial')); await mounted.task
  const mutation = view.updatePlan('user-42', 'pro')
  mounted.cleanup?.()
  h.requests[1].resolve({ ok: true }); await flush()
  for (const request of h.requests.slice(2)) request.resolve(h.response('unexpected'))
  await mutation
  assert.equal(h.requests.length, 2)
  assert.equal(h.state.rows[0].id, 'initial')
})
