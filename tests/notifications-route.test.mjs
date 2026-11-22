import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'
import { z } from 'zod'

const source = readFileSync(new URL('../src/app/api/notifications/route.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText
const ownId = '00000000-0000-4000-8000-000000000001'
const otherId = '00000000-0000-4000-8000-000000000002'

function harness({ failure, mode = 'returned', unauthorized = false, noProfile = false } = {}) {
  const calls = [], rows = [
    { id: ownId, user_id: 'profile-current', title: 'Own notification', read_at: null },
    { id: otherId, user_id: 'profile-other', title: 'Other notification', read_at: null },
  ]
  const fail = stage => {
    if (failure !== stage) return false
    if (mode === 'thrown') throw new Error('PRIVATE_DATABASE_OR_NETWORK_DETAIL')
    return { message: 'PRIVATE_DATABASE_OR_NETWORK_DETAIL' }
  }
  function builder(table, service = false) {
    const call = { table, service, operations: [] }; calls.push(call)
    const query = {}
    for (const method of ['select', 'eq', 'order', 'limit', 'update', 'in', 'is']) {
      query[method] = (...args) => { call.operations.push([method, ...args]); return query }
    }
    function execute(single) {
      const update = call.operations.find(([name]) => name === 'update')
      const stage = single ? 'profile' : update ? 'update' : 'list'
      const error = fail(stage)
      if (error) return { data: null, error }
      if (single) return { data: noProfile ? null : { id: 'profile-current' }, error: null }
      const matches = rows.filter(row => call.operations.every(([method, key, value]) =>
        method === 'eq' || method === 'is' ? row[key] === value : method === 'in' ? value.includes(row[key]) : true))
      if (update) {
        for (const row of matches) Object.assign(row, update[1])
        return { data: null, error: null }
      }
      return { data: matches.map(({ user_id: _owner, ...row }) => ({ ...row })), error: null }
    }
    query.maybeSingle = async () => execute(true)
    query.then = (resolve, reject) => Promise.resolve().then(() => execute(false)).then(resolve, reject)
    return query
  }
  const dependencies = {
    'next/server': { NextResponse: { json: (body, init = {}) => ({ status: init.status ?? 200, body: structuredClone(body) }) } },
    zod: { z },
    '@/lib/supabase-server': { createServerSupabaseClient: async () => {
      fail('client')
      return {
        auth: { getUser: async () => {
          fail('auth')
          return { data: { user: unauthorized ? null : { id: 'authenticated-current' } } }
        } },
        from: table => builder(table),
      }
    } },
    '@/lib/supabase': { createServiceClient: () => {
      fail('service')
      return { from: table => builder(table, true) }
    } },
  }
  const exports = {}
  vm.runInNewContext(compiled, {
    exports, Date, Error,
    require: name => { assert.ok(name in dependencies, `Unexpected import ${name}`); return dependencies[name] },
  })
  return { route: exports, rows, calls }
}

const patchRequest = body => ({ json: async () => body })
const variants = [
  { name: 'allRead', body: { allRead: true }, filter: ['is', 'read_at', null] },
  { name: 'ids', body: { ids: [ownId, otherId] }, filter: ['in', 'id', [ownId, otherId]] },
]

function assertGenericFailure(response) {
  assert.equal(response.status, 500)
  assert.deepEqual(Object.keys(response.body), ['error'])
  assert.equal(typeof response.body.error, 'string')
  assert.doesNotMatch(JSON.stringify(response.body), /PRIVATE|profile-current|Own notification/)
}

for (const mode of ['returned', 'thrown']) {
  for (const method of ['GET', 'PATCH']) {
    test(`${method}: ${mode} profile lookup failure produces an explicit generic error`, async () => {
      const h = harness({ failure: 'profile', mode })
      const response = await h.route[method](patchRequest({ allRead: true }))
      assertGenericFailure(response)
      assert.equal(h.calls.filter(call => call.service).length, 0)
    })
  }
  test(`GET: ${mode} list failure does not become an empty notification list`, async () => {
    const h = harness({ failure: 'list', mode })
    assertGenericFailure(await h.route.GET())
  })
  for (const variant of variants) {
    test(`PATCH ${variant.name}: ${mode} update failure never reports success`, async () => {
      const h = harness({ failure: 'update', mode })
      assertGenericFailure(await h.route.PATCH(patchRequest(variant.body)))
      assert.equal(h.rows[0].read_at, null)
      assert.equal(h.rows[1].read_at, null)
    })
  }
}

for (const stage of ['client', 'auth', 'service']) {
  for (const method of ['GET', 'PATCH']) {
    test(`${method}: ${stage} network exception becomes a generic JSON failure`, async () => {
      const h = harness({ failure: stage, mode: 'thrown' })
      assertGenericFailure(await h.route[method](patchRequest({ allRead: true })))
    })
  }
}

test('GET preserves success shape and lists only the authenticated profile notifications', async () => {
  const h = harness(), response = await h.route.GET()
  assert.deepEqual(response, { status: 200, body: { notifications: [
    { id: ownId, title: 'Own notification', read_at: null },
  ], unread: 1 } })
  assert.deepEqual(h.calls[0].operations.find(([method]) => method === 'eq'), ['eq', 'auth_user_id', 'authenticated-current'])
  assert.ok(h.calls[1].operations.some(op => JSON.stringify(op) === JSON.stringify(['eq', 'user_id', 'profile-current'])))
})

for (const variant of variants) {
  test(`PATCH ${variant.name}: success keeps both identity filters and cannot alter another profile`, async () => {
    const h = harness()
    const response = await h.route.PATCH(patchRequest({ ...variant.body, user_id: 'profile-other' }))
    assert.deepEqual(response, { status: 200, body: { ok: true } })
    assert.equal(typeof h.rows[0].read_at, 'string')
    assert.equal(h.rows[1].read_at, null)
    assert.deepEqual(h.calls[0].operations.find(([method]) => method === 'eq'), ['eq', 'auth_user_id', 'authenticated-current'])
    assert.ok(h.calls[1].operations.some(op => JSON.stringify(op) === JSON.stringify(['eq', 'user_id', 'profile-current'])))
    assert.ok(h.calls[1].operations.some(op => JSON.stringify(op) === JSON.stringify(variant.filter)))
  })
}

for (const method of ['GET', 'PATCH']) {
  test(`${method}: unauthenticated caller remains denied before any table access`, async () => {
    const h = harness({ unauthorized: true })
    const response = await h.route[method](patchRequest({ allRead: true }))
    assert.equal(response.status, 401)
    assert.deepEqual(h.calls, [])
  })
}

test('missing profile retains the existing GET empty and PATCH not-found contracts', async () => {
  const h = harness({ noProfile: true })
  assert.deepEqual(await h.route.GET(), { status: 200, body: { notifications: [], unread: 0 } })
  const response = await h.route.PATCH(patchRequest({ allRead: true }))
  assert.equal(response.status, 404)
  assert.equal(h.calls.filter(call => call.service).length, 0)
})

for (const mode of ['invalid-json', 'invalid-ids']) {
  test(`PATCH ${mode} retains validation failure before any write`, async () => {
    const h = harness()
    const request = mode === 'invalid-json'
      ? { json: async () => { throw new Error('PRIVATE_JSON_DETAIL') } }
      : patchRequest({ ids: ['not-a-uuid'] })
    const response = await h.route.PATCH(request)
    assert.equal(response.status, 400)
    assert.doesNotMatch(JSON.stringify(response.body), /PRIVATE/)
    assert.equal(h.calls.filter(call => call.service).length, 0)
  })
}
