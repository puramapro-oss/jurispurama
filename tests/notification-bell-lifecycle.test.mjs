import assert from 'node:assert/strict'
import { test as nodeTest } from 'node:test'
import { callback, deferred } from './lifecycle-source.mjs'

const test = (name, run) => nodeTest(name, { timeout: 2_000 }, run)
const flush = () => new Promise(resolve => setImmediate(resolve))

const file = 'src/components/layout/NotificationBell.tsx'
const baseRef = process.env.JURIS_NOTIFICATION_BASE_REF
const row = (id, read_at = null) => ({ id, type: 'test', title: id, message: null,
  link: null, read_at, created_at: '2026-11-22T00:00:00.000Z' })
const payload = (id, unread = 1) => ({ notifications: [row(id, unread ? null : '2026-11-22T01:00:00.000Z')], unread })
const response = data => ({ ok: true, json: async () => data })

function harness() {
  const state = { items: [row('initial')], unread: 1 }
  const requests = [], updates = [], microtasks = [], intervals = new Map()
  const context = {
    AbortController, mountedRef: { current: true }, requestRef: { current: null },
    mutationRef: { current: null },
    setItems: value => { state.items = typeof value === 'function' ? value(state.items) : value; updates.push('items') },
    setUnread: value => { state.unread = value; updates.push('unread') },
    fetch: (url, options = {}) => {
      const pending = deferred()
      requests.push({ url, options, ...pending })
      return pending.promise
    },
    queueMicrotask: action => { microtasks.push(action) },
    setInterval: action => { const id = Symbol(); intervals.set(id, action); return id },
    clearInterval: id => { intervals.delete(id) },
  }
  const load = callback(file, 'load', context, baseRef)
  context.load = load
  const markAllRead = callback(file, 'markAllRead', context, baseRef)
  const effect = callback(file, 'effect', context, baseRef)
  const cleanup = effect()
  return { state, requests, updates, microtasks, intervals, load, markAllRead, cleanup, effect }
}

test('PATCH HTTP failure preserves unread notifications', async () => {
  const h = harness(), before = JSON.stringify(h.state), task = h.markAllRead()
  assert.equal(h.requests[0].options.method, 'PATCH')
  h.requests[0].resolve({ ok: false, status: 500, json: async () => ({ error: 'private detail' }) })
  await task
  assert.equal(JSON.stringify(h.state), before)
  assert.equal(h.requests.length, 1)
  assert.deepEqual(h.updates, [])
})

test('a GET started before marking read cannot restore old unread badges', async () => {
  const h = harness(), body = deferred(), old = h.load()
  h.requests[0].resolve({ ok: true, json: () => body.promise }); await flush()
  const write = h.markAllRead()
  h.requests[1].resolve(response({ ok: true })); await flush()
  const refresh = h.requests[2]
  if (refresh) refresh.resolve(response(payload('current', 0)))
  await write
  const current = JSON.stringify(h.state)
  body.resolve(payload('obsolete', 3)); await old
  assert.equal(JSON.stringify(h.state), current)
})

test('confirmed PATCH refreshes server state and retains a newly arrived unread notification', async () => {
  const h = harness(), task = h.markAllRead()
  assert.equal(h.requests[0].url, '/api/notifications')
  assert.deepEqual(JSON.parse(h.requests[0].options.body), { allRead: true })
  h.requests[0].resolve(response({ ok: true })); await flush()
  assert.equal(h.requests.length, 2)
  assert.equal(h.requests[1].options.method ?? 'GET', 'GET')
  assert.equal(h.requests[1].options.cache, 'no-store')
  assert.deepEqual(h.updates, [], 'do not fabricate local read timestamps or a zero badge')
  const current = { notifications: [row('older', '2026-11-22T02:00:00Z'), row('new')], unread: 1 }
  h.requests[1].resolve(response(current)); await task
  assert.deepEqual(h.state, { items: current.notifications, unread: current.unread })
})

for (const mode of ['network', 'json', 'negative-acknowledgement']) {
  test(`PATCH ${mode} failure preserves state and permits a later retry`, async () => {
    const h = harness(), before = JSON.stringify(h.state), task = h.markAllRead()
    if (mode === 'network') h.requests[0].reject(new Error('private detail'))
    else if (mode === 'json') h.requests[0].resolve({ ok: true, json: async () => { throw new Error('private JSON') } })
    else h.requests[0].resolve(response({ ok: false }))
    await task
    assert.equal(JSON.stringify(h.state), before)
    assert.equal(h.requests.length, 1)
    const retry = h.markAllRead()
    assert.equal(h.requests.length, 2)
    h.requests[1].reject(new Error('retry transport')); await retry
  })
}

test('pending PATCH prevents duplicate mutations and polling against pre-mutation state', async () => {
  const h = harness(), task = h.markAllRead(), duplicate = h.markAllRead(), poll = h.load()
  assert.equal(h.requests.length, 1)
  h.requests[0].resolve({ ok: false, status: 500 }); await Promise.all([task, duplicate, poll])
})

test('current GET preserves the server notification list and count', async () => {
  const h = harness(), task = h.load(), current = payload('current', 2)
  h.requests[0].resolve(response(current)); await task
  assert.deepEqual(h.state, { items: current.notifications, unread: current.unread })
})

for (const mode of ['http', 'json', 'invalid-shape']) {
  test(`GET ${mode} failure does not erase the previously known notifications`, async () => {
    const h = harness(), before = JSON.stringify(h.state), task = h.load()
    if (mode === 'http') h.requests[0].resolve({ ok: false, status: 500 })
    else if (mode === 'json') h.requests[0].resolve({ ok: true, json: async () => { throw new Error('private body') } })
    else h.requests[0].resolve(response({ notifications: {}, unread: -1 }))
    await task
    assert.equal(JSON.stringify(h.state), before)
    assert.deepEqual(h.updates, [])
  })
}

test('a late decoded GET cannot replace a newer GET', async () => {
  const h = harness(), body = deferred(), old = h.load()
  h.requests[0].resolve({ ok: true, json: () => body.promise }); await flush()
  const current = h.load()
  assert.equal(h.requests[0].options.signal.aborted, true)
  h.requests[1].resolve(response(payload('current', 0))); await current
  const before = JSON.stringify(h.state)
  body.resolve(payload('obsolete')); await old
  assert.equal(JSON.stringify(h.state), before)
})

test('unmount aborts the read, clears polling and ignores its late JSON', async () => {
  const h = harness(), body = deferred(), task = h.load()
  h.requests[0].resolve({ ok: true, json: () => body.promise }); await flush()
  h.cleanup()
  assert.equal(h.intervals.size, 0)
  assert.equal(h.requests[0].options.signal.aborted, true)
  const count = h.updates.length
  body.resolve(payload('unmounted')); await task
  assert.equal(h.updates.length, count)
})

test('unmount ignores a late PATCH acknowledgement without starting another GET', async () => {
  const h = harness(), body = deferred(), task = h.markAllRead()
  h.requests[0].resolve({ ok: true, json: () => body.promise }); await flush()
  h.cleanup()
  assert.equal(h.requests[0].options.signal.aborted, true)
  const count = h.updates.length
  body.resolve({ ok: true }); await task
  assert.equal(h.requests.length, 1)
  assert.equal(h.updates.length, count)
})

test('an unmounted initial microtask or retained callback cannot start any request', async () => {
  const h = harness()
  h.cleanup()
  for (const action of h.microtasks) action()
  await h.load(); await h.markAllRead(); await flush()
  assert.equal(h.requests.length, 0)
  assert.equal(h.intervals.size, 0)
})

test('unmount during post-PATCH refresh ignores its late body', async () => {
  const h = harness(), body = deferred(), task = h.markAllRead()
  h.requests[0].resolve(response({ ok: true })); await flush()
  assert.equal(h.requests.length, 2)
  h.requests[1].resolve({ ok: true, json: () => body.promise }); await flush()
  h.cleanup()
  const count = h.updates.length
  body.resolve(payload('unmounted')); await task
  assert.equal(h.updates.length, count)
})
