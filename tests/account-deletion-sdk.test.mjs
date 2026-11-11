import test from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { createRequire } from 'node:module'
import { instantiateHandler, instantiateCancellation, readRoute, requestRow } from './account-deletion-harness.mjs'

// Use the app's installed SDK, or an isolated installation of its lockfile version.
// All HTTP is intercepted; this test never calls a real Supabase endpoint.
const require = createRequire(process.env.JURIS_TEST_DEPENDENCY_ROOT
  ? path.resolve(process.env.JURIS_TEST_DEPENDENCY_ROOT, 'package.json')
  : new URL('../package.json', import.meta.url))
const { createClient } = require('@supabase/supabase-js')
const { z } = require('zod')
const cronSource = readRoute('src/app/api/cron/account-deletion/route.ts')
const cancellationSource = readRoute('src/app/api/account/delete/route.ts')

function backend(mode = 'claimed') {
  const row = requestRow('sdk')
  const requests = []
  const deleteCalls = []
  const client = createClient('https://supabase-test.invalid', 'fake-service-key-not-a-secret', {
    db: { schema: 'jurispurama' },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      fetch: async (input, init) => {
        const url = new URL(input)
        assert.equal(url.origin, 'https://supabase-test.invalid')
        assert.equal(url.pathname, '/rest/v1/account_deletion_requests')
        const body = init.body ? JSON.parse(init.body) : null
        requests.push({ method: init.method, url: url.href, body, headers: Object.fromEntries(new Headers(init.headers)) })
        if (init.method === 'GET') return Response.json(mode === 'schedule-new' || mode === 'schedule-conflict' ? [] : [row])
        if (body.status === 'scheduled') {
          assert(['PATCH', 'POST'].includes(init.method))
          assert.match(new Headers(init.headers).get('prefer'), /return=representation/)
          if (mode === 'schedule-conflict') return Response.json({ code: '23505', message: 'SIMULATED_UNIQUE_CONFLICT' }, { status: 409 })
          if (mode === 'schedule-lost') return Response.json([])
          if (mode === 'schedule-error') return Response.json({ code: '42501', message: 'SIMULATED_WRITE_ERROR' }, { status: 403 })
          return Response.json([{ id: row.id, ...body, scheduled_for: body.scheduled_for.replace('Z', '+00:00') }])
        }
        assert.equal(init.method, 'PATCH')
        if (body.status === 'completed') return new Response(null, { status: 204 })
        assert.match(new Headers(init.headers).get('prefer'), /return=representation/)
        // The lockfile SDK requests a list for every method and enforces
        // maybeSingle cardinality locally; model the actual HTTP contract.
        if (mode === 'zero') return Response.json([])
        if (mode === 'error') return Response.json({ code: '42501', message: 'SIMULATED_DATABASE_REJECTION' }, { status: 403 })
        return Response.json([{ id: row.id, user_id: row.user_id }])
      },
    },
  })
  client.auth.admin.deleteUser = async userId => { deleteCalls.push(userId); return { data: null, error: null } }
  return { service: client, rows: [row], requests, deleteCalls }
}

for (const [mode, expected, method] of [
  ['schedule-new', 200, 'POST'], ['schedule-existing', 200, 'PATCH'],
  ['schedule-conflict', 409, 'POST'], ['schedule-lost', 409, 'PATCH'], ['schedule-error', 500, 'PATCH'],
]) {
  test(`the installed SDK scheduling receipt ${mode} yields HTTP ${expected}`, async () => {
    const state = backend(mode)
    const api = await instantiateCancellation(state, cancellationSource, { zod: z })
    const response = await api.POST(new Request('https://app-test.invalid/api/account/delete', {
      method: 'POST', body: JSON.stringify({ confirm: 'DELETE_MY_ACCOUNT' }),
    }))
    assert.equal(response.status, expected)
    assert.equal(state.deleteCalls.length, 0)
    assert.equal(state.requests.length, 2)
    const write = state.requests[1]
    assert.equal(write.method, method)
    assert(!write.headers.prefer.includes('resolution=merge-duplicates'))
    if (method === 'PATCH') {
      const params = new URL(write.url).searchParams
      assert.equal(params.get('id'), 'eq.fake-request-sdk')
      assert.equal(params.get('user_id'), 'eq.fake-user-sdk')
      assert.equal(params.get('status'), 'eq.scheduled')
      assert.equal(params.get('scheduled_for'), 'eq.2026-11-10T12:00:00.000Z')
    }
    assert.equal(response.body.debug, undefined)
  })
}

test('the installed SDK sends all claim filters and returns the acquired identity', async () => {
  const state = backend()
  const cron = await instantiateHandler(state, cronSource)
  const response = await cron.GET({})
  assert.equal(response.status, 200)
  assert.equal(state.deleteCalls.length, 1)
  const claim = state.requests.find(x => x.body?.status === 'executing')
  const params = new URL(claim.url).searchParams
  assert.equal(params.get('id'), 'eq.fake-request-sdk')
  assert.equal(params.get('user_id'), 'eq.fake-user-sdk')
  assert.equal(params.get('status'), 'eq.scheduled')
  assert.deepEqual(params.getAll('scheduled_for'), ['eq.2026-11-10T12:00:00.000Z', 'lte.2026-11-11T12:00:00.000Z'])
  assert.equal(params.get('select'), 'id,user_id')
  assert.equal(claim.headers['content-profile'], 'jurispurama')
})

test('the installed SDK treats a zero-row PATCH receipt as an unacquired claim', async () => {
  const state = backend('zero')
  const cron = await instantiateHandler(state, cronSource)
  const response = await cron.GET({})
  assert.equal(response.status, 200)
  assert.equal(response.body.skipped, 1)
  assert.equal(state.deleteCalls.length, 0)
})

test('the installed SDK reports a rejected claim before deletion', async () => {
  const state = backend('error')
  const cron = await instantiateHandler(state, cronSource)
  const response = await cron.GET({})
  assert.equal(response.status, 500)
  assert.equal(response.body.failed, 1)
  assert.equal(state.deleteCalls.length, 0)
})

for (const [mode, expected] of [['claimed', 200], ['zero', 409], ['error', 500]]) {
  test(`the installed SDK cancellation receipt ${mode} yields HTTP ${expected}`, async () => {
    const state = backend(mode)
    const cancel = await instantiateCancellation(state, cancellationSource)
    const response = await cancel.DELETE({})
    assert.equal(response.status, expected)
    assert.equal(state.requests.length, 1)
    assert.equal(state.deleteCalls.length, 0)
    const params = new URL(state.requests[0].url).searchParams
    assert.equal(params.get('user_id'), 'eq.fake-user-sdk')
    assert.equal(params.get('status'), 'eq.scheduled')
    assert.equal(params.get('select'), 'id')
    assert.equal(response.body.debug, undefined)
  })
}
