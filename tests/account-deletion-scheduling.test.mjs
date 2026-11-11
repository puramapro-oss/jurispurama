import test from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { createRequire } from 'node:module'
import { createBackend, instantiateHandler, instantiateAccount, readRoute, requestRow, beforeFirstClaim } from './account-deletion-harness.mjs'

const require = createRequire(process.env.JURIS_TEST_DEPENDENCY_ROOT
  ? path.resolve(process.env.JURIS_TEST_DEPENDENCY_ROOT, 'package.json')
  : new URL('../package.json', import.meta.url))
const { z } = require('zod')
const cronSource = readRoute('src/app/api/cron/account-deletion/route.ts')
const accountSource = readRoute('src/app/api/account/delete/route.ts')
const request = (body = { confirm: 'DELETE_MY_ACCOUNT' }) => new Request('https://app-test.invalid/api/account/delete', { method: 'POST', body: JSON.stringify(body) })
const account = (state, options) => instantiateAccount(state, accountSource, { zod: z, ...options })

function beforeSchedulingWrite(state, callback) {
  const originalFrom = state.service.from
  let injected = false
  state.service.from = (...args) => {
    const query = originalFrom(...args)
    const originalThen = query.then.bind(query)
    query.then = (resolve, reject) => {
      if (!injected && query.payload?.status === 'scheduled') {
        injected = true
        return Promise.resolve().then(callback).then(() => originalThen(resolve, reject), reject)
      }
      return originalThen(resolve, reject)
    }
    return query
  }
}

test('POST cannot promise a new grace period after the cron has acquired the request', async () => {
  const state = createBackend([requestRow('already-claimed')])
  const api = await account(state)
  const originalDelete = state.service.auth.admin.deleteUser
  let postResponse
  state.service.auth.admin.deleteUser = async userId => {
    postResponse = await api.POST(request())
    assert.equal(state.rows[0].status, 'executing')
    return originalDelete(userId)
  }
  const cron = await instantiateHandler(state, cronSource)
  const response = await cron.GET({})
  assert.equal(postResponse.status, 409)
  assert.equal(postResponse.body.ok, undefined)
  assert.equal(response.body.succeeded, 1)
  assert.equal(state.deleteCalls.length, 1)
})

test('POST winning before cron acquisition postpones deletion', async () => {
  const state = createBackend([requestRow('post-wins')])
  const api = await account(state)
  let postResponse
  beforeFirstClaim(state, async () => { postResponse = await api.POST(request()) })
  const cron = await instantiateHandler(state, cronSource)
  const response = await cron.GET({})
  assert.equal(postResponse.status, 200)
  assert.equal(state.rows[0].status, 'scheduled')
  assert.equal(response.body.skipped, 1)
  assert.equal(state.deleteCalls.length, 0)
})

test('a cron winning between POST read and write prevents rescheduling', async () => {
  const state = createBackend([requestRow('cron-wins-write')])
  const api = await account(state)
  const cron = await instantiateHandler(state, cronSource)
  beforeSchedulingWrite(state, () => cron.GET({}))
  const response = await api.POST(request())
  assert.equal(response.status, 409)
  assert.equal(state.rows[0].status, 'completed')
  assert.equal(state.deleteCalls.length, 1)
})

test('a cancellation winning between POST read and write is not undone', async () => {
  const state = createBackend([requestRow('cancel-before-post-write')])
  const api = await account(state)
  beforeSchedulingWrite(state, () => api.DELETE({}))
  const response = await api.POST(request())
  assert.equal(response.status, 409)
  assert.equal(state.rows[0].status, 'cancelled')
})

for (const status of ['executing', 'completed']) {
  test(`POST refuses to overwrite a ${status} request`, async () => {
    const state = createBackend([{ ...requestRow(status), status }])
    const api = await account(state)
    const response = await api.POST(request())
    assert.equal(response.status, 409)
    assert.equal(state.rows[0].status, status)
    assert(state.events.every(x => x.operation === 'select'))
  })
}

test('POST may reschedule a cancelled request with a new grace period', async () => {
  const state = createBackend([{ ...requestRow('cancelled'), status: 'cancelled', cancelled_at: '2026-11-10T12:00:00.000Z' }])
  const api = await account(state)
  const response = await api.POST(request({ confirm: 'DELETE_MY_ACCOUNT', reason: 'Test reason' }))
  assert.equal(response.status, 200)
  assert.equal(response.body.grace_period_days, 30)
  assert.equal(state.rows[0].status, 'scheduled')
  assert.equal(state.rows[0].cancelled_at, null)
  assert.equal(state.rows[0].reason, 'Test reason')
  assert.equal(Date.parse(state.rows[0].scheduled_for), Date.parse(response.body.scheduled_for))
})

test('POST inserts the first request for its authenticated user', async () => {
  const state = createBackend([])
  const api = await account(state, { userId: 'fake-new-user' })
  const response = await api.POST(request())
  assert.equal(response.status, 200)
  assert.equal(state.rows.length, 1)
  assert.equal(state.rows[0].user_id, 'fake-new-user')
  assert(state.events.some(x => x.operation === 'insert'))
})

for (const initialRows of [[], [requestRow('same-user')]]) {
  test(`concurrent POST ${initialRows.length ? 'rescheduling' : 'creation'} has a single winner`, async () => {
    const state = createBackend(initialRows)
    const userId = initialRows[0]?.user_id ?? 'fake-new-user'
    const a = await account(state, { userId })
    const b = await account(state, { userId })
    const responses = await Promise.all([a.POST(request()), b.POST(request())])
    assert.deepEqual(responses.map(x => x.status).sort(), [200, 409])
    assert.equal(state.rows.length, 1)
  })
}

test('POST does not change another user request', async () => {
  const other = requestRow('other-user')
  const state = createBackend([other])
  const api = await account(state, { userId: 'fake-own-user' })
  const response = await api.POST(request())
  assert.equal(response.status, 200)
  assert.deepEqual(state.rows[0], other)
  assert.equal(state.rows[1].user_id, 'fake-own-user')
})

for (const [body, options, status] of [
  [{ confirm: 'WRONG' }, {}, 400],
  [{ confirm: 'DELETE_MY_ACCOUNT', reason: 'x'.repeat(501) }, {}, 400],
  [{ confirm: 'DELETE_MY_ACCOUNT' }, { authorized: false }, 401],
  [{ confirm: 'DELETE_MY_ACCOUNT' }, { allowed: false }, 429],
]) {
  test(`POST refuses invalid or unauthorized input before DB access (${status}, ${JSON.stringify(options)})`, async () => {
    const state = createBackend([requestRow('input')])
    const api = await account(state, options)
    const response = await api.POST(request(body))
    assert.equal(response.status, status)
    assert.equal(state.events.length, 0)
  })
}

test('POST database read failure is redacted and does not write', async () => {
  const state = createBackend([requestRow('read-error')])
  state.service.from = () => {
    const query = { select: () => query, eq: () => query, maybeSingle: () => query,
      then: resolve => Promise.resolve(resolve({ data: null, error: { code: 'FAKE_READ_ERROR', message: 'internal-detail-not-for-client' } })),
    }
    return query
  }
  const api = await account(state)
  const response = await api.POST(request())
  assert.equal(response.status, 500)
  assert.deepEqual(response.body, { error: 'Demande impossible.' })
  assert.equal(state.events.length, 0)
})
