import assert from 'node:assert/strict'
import { test } from 'node:test'
import { callback, deferred, flush } from './lifecycle-source.mjs'

const baseRef = process.env.JURIS_READ_LIFECYCLE_BASE_REF
const specs = [
  { page: 'admin/ambassadeurs', load: 'load', url: '/api/admin/influencers',
    message: 'Impossible de charger les ambassadeurs. Réessaie.',
    payload: id => ({ influencers: [{ id }], withdrawals: [{ id }] }),
    fields: { setInfluencers: 'influencers', setWithdrawals: 'withdrawals' } },
  { page: 'gratitude', load: 'fetchEntries', url: '/api/gratitude',
    message: 'Impossible de charger tes gratitudes. Réessaie.',
    payload: id => ({ entries: [{ id }] }), fields: { setEntries: 'entries' } },
  { page: 'points', load: 'fetchPoints', url: '/api/points',
    message: 'Impossible de charger tes points.',
    payload: id => ({ id, points: 12 }), fields: { setData: 'data' } },
  { page: 'wallet', load: 'fetchWallet', url: '/api/wallet',
    message: 'Impossible de charger ton wallet.',
    payload: id => ({ id, balance: 5 }), fields: { setData: 'data' } },
  { page: 'parrainage', load: 'refresh', url: '/api/referral',
    message: 'Impossible de charger ton parrainage. Réessaie.',
    payload: id => ({ stats: { id, totalConversions: 2 } }), fields: { setStats: 'stats' } },
  { page: 'ambassadeur', load: 'load', url: '/api/influencer',
    message: 'Impossible de charger ton espace ambassadeur. Réessaie.',
    payload: id => ({ influencer: { id, total_conversions: 2 } }), fields: { setInfluencer: 'influencer' } },
]

function harness(spec) {
  const file = `src/app/(dashboard)/${spec.page}/page.tsx`
  const state = { loading: true }, requests = [], errors = [], updates = []
  const context = {
    AbortController, requestRef: { current: null },
    setLoading: value => { state.loading = value; updates.push('loading') },
    toast: { error: message => errors.push(message) },
    fetch: (url, options = {}) => {
      const pending = deferred()
      requests.push({ url, options, ...pending })
      return pending.promise
    },
  }
  for (const [setter, field] of Object.entries(spec.fields)) {
    context[setter] = value => { state[field] = value; updates.push(field) }
  }
  const load = callback(file, spec.load, context, baseRef)
  let pending
  context[spec.load] = () => { pending = load(); return pending }
  const effect = callback(file, 'effect', context, baseRef)
  const response = id => ({ ok: true, json: async () => spec.payload(id) })
  return { state, requests, errors, updates, load, response,
    mount: () => ({ cleanup: effect(), task: pending }) }
}

for (const spec of specs) {
  test(`${spec.page}: current GET finishes loading and preserves every response field`, async () => {
    const h = harness(spec), mounted = h.mount()
    assert.equal(h.requests[0].url, spec.url)
    assert.equal(h.requests[0].options.method ?? 'GET', 'GET')
    assert.equal(h.state.loading, true)
    h.requests[0].resolve(h.response('current')); await mounted.task
    const payload = spec.payload('current')
    for (const field of Object.values(spec.fields)) assert.deepEqual(h.state[field], field === 'data' ? payload : payload[field])
    assert.equal(h.state.loading, false)
  })

  test(`${spec.page}: cancelled read cannot clear the current loader or report an error`, async () => {
    const h = harness(spec), old = h.load(), current = h.load()
    assert.equal(h.requests[0].options.signal.aborted, true)
    h.requests[0].reject(new Error('obsolete transport')); await old
    assert.equal(h.state.loading, true)
    assert.deepEqual(h.errors, [])
    h.requests[1].resolve(h.response('current')); await current
    assert.equal(h.state.loading, false)
  })

  test(`${spec.page}: a late decoded body cannot replace a more recent refresh`, async () => {
    const h = harness(spec), body = deferred(), old = h.load()
    h.requests[0].resolve({ ok: true, json: () => body.promise }); await flush()
    const current = h.load()
    h.requests[1].resolve(h.response('current')); await current
    const before = JSON.stringify(h.state)
    body.resolve(spec.payload('obsolete')); await old
    assert.equal(JSON.stringify(h.state), before)
  })

  test(`${spec.page}: unmount aborts transport and ignores late JSON`, async () => {
    const h = harness(spec), body = deferred(), mounted = h.mount()
    h.requests[0].resolve({ ok: true, json: () => body.promise }); await flush()
    assert.equal(typeof mounted.cleanup, 'function')
    mounted.cleanup()
    assert.equal(h.requests[0].options.signal.aborted, true)
    const count = h.updates.length
    body.resolve(spec.payload('unmounted')); await mounted.task
    assert.equal(h.updates.length, count)
    assert.deepEqual(h.errors, [])
  })

  for (const mode of ['network', 'json']) {
    test(`${spec.page}: ${mode} failure ends loading and reports only the safe message`, async () => {
      const h = harness(spec), task = h.load()
      if (mode === 'network') h.requests[0].reject(new Error('private detail'))
      else h.requests[0].resolve({ ok: true, json: async () => { throw new Error('private body') } })
      await assert.doesNotReject(task)
      assert.equal(h.state.loading, false)
      assert.deepEqual(h.errors, [spec.message])
    })
  }
}
