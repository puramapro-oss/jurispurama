import test from 'node:test'
import assert from 'node:assert/strict'
import {
  createBackend, instantiateHandler, requestRow,
  instantiateCancellation, readRoute, beforeFirstClaim,
} from './account-deletion-harness.mjs'

const cronSource = readRoute('src/app/api/cron/account-deletion/route.ts')
const cancellationSource = readRoute('src/app/api/account/delete/route.ts')

test('two concurrent cron handlers claim a due request at most once', async () => {
  const backend = createBackend([requestRow('concurrent')])
  const first = await instantiateHandler(backend, cronSource)
  const second = await instantiateHandler(backend, cronSource)
  const responses = await Promise.all([first.GET({}), second.POST({})])
  assert.equal(backend.deleteCalls.length, 1)
  assert.equal(responses.reduce((sum, r) => sum + r.body.processed, 0), 1)
  assert.equal(responses.reduce((sum, r) => sum + (r.body.skipped ?? 0), 0), 1)
  assert(responses.every(r => r.status === 200 && r.body.ok))
})

for (const [name, mutate] of [
  ['cancelled', row => { row.status = 'cancelled' }],
  ['postponed', row => { row.scheduled_for = '2026-12-11T12:00:00.000Z' }],
  ['rescheduled but still due', row => { row.scheduled_for = '2026-11-11T10:00:00.000Z' }],
  ['user identity changed', row => { row.user_id = 'another-fake-user' }],
]) {
  test(`a request ${name} after the scan is not deleted`, async () => {
    const backend = createBackend([requestRow(name)])
    beforeFirstClaim(backend, () => mutate(backend.rows[0]))
    const handler = await instantiateHandler(backend, cronSource)
    const response = await handler.GET({})
    assert.equal(response.status, 200)
    assert.equal(response.body.processed, 0)
    assert.equal(response.body.skipped, 1)
    assert.equal(backend.deleteCalls.length, 0)
  })
}

test('a request removed after the scan is not deleted', async () => {
  const backend = createBackend([requestRow('removed')])
  beforeFirstClaim(backend, () => backend.rows.splice(0))
  const handler = await instantiateHandler(backend, cronSource)
  const response = await handler.GET({})
  assert.equal(response.body.skipped, 1)
  assert.equal(backend.deleteCalls.length, 0)
})

for (const badData of [undefined, {}, { id: 'other-request', user_id: 'fake-user-invalid-claim' }]) {
  test(`unconfirmed claim ${JSON.stringify(badData)} fails before auth deletion`, async () => {
    const backend = createBackend([requestRow('invalid-claim')])
    const originalFrom = backend.service.from
    let queries = 0
    backend.service.from = (...args) => {
      const query = originalFrom(...args)
      if (++queries === 2) {
        const originalThen = query.then.bind(query)
        query.then = (resolve, reject) => originalThen(result => resolve({ ...result, data: badData }), reject)
      }
      return query
    }
    const handler = await instantiateHandler(backend, cronSource)
    const response = await handler.GET({})
    assert.equal(response.status, 500)
    assert.equal(response.body.ok, false)
    assert.equal(backend.deleteCalls.length, 0)
  })
}

test('an auth cascade removing its request does not turn a deletion into a retry', async () => {
  const backend = createBackend([requestRow('cascade')])
  const originalDelete = backend.service.auth.admin.deleteUser
  backend.service.auth.admin.deleteUser = async userId => {
    const result = await originalDelete(userId)
    backend.rows.splice(0)
    return result
  }
  const handler = await instantiateHandler(backend, cronSource)
  const response = await handler.GET({})
  assert.equal(response.status, 200)
  assert.equal(response.body.succeeded, 1)
  await handler.GET({})
  assert.equal(backend.deleteCalls.length, 1)
})

test('the real cancellation handler winning before claim prevents deletion', async () => {
  const backend = createBackend([requestRow('cancel-wins')])
  const cancellation = await instantiateCancellation(backend, cancellationSource)
  let cancellationResponse
  beforeFirstClaim(backend, async () => { cancellationResponse = await cancellation.DELETE({}) })
  const cron = await instantiateHandler(backend, cronSource)
  const response = await cron.GET({})
  assert.equal(cancellationResponse.status, 200)
  assert.equal(backend.rows[0].status, 'cancelled')
  assert.equal(backend.deleteCalls.length, 0)
  assert.equal(response.body.skipped, 1)
})

test('cancellation after claim reports conflict without pretending to stop deletion', async () => {
  const backend = createBackend([requestRow('claim-wins')])
  const cancellation = await instantiateCancellation(backend, cancellationSource)
  const originalDelete = backend.service.auth.admin.deleteUser
  let cancellationResponse
  backend.service.auth.admin.deleteUser = async userId => {
    cancellationResponse = await cancellation.DELETE({})
    return originalDelete(userId)
  }
  const cron = await instantiateHandler(backend, cronSource)
  const response = await cron.GET({})
  assert.equal(cancellationResponse.status, 409)
  assert.equal(cancellationResponse.body.ok, undefined)
  assert.equal(response.body.succeeded, 1)
  assert.equal(backend.deleteCalls.length, 1)
})

test('cancellation changes only the authenticated user scheduled request', async () => {
  const own = requestRow('own')
  const other = requestRow('other')
  const backend = createBackend([own, other])
  const cancellation = await instantiateCancellation(backend, cancellationSource, { userId: own.user_id })
  const response = await cancellation.DELETE({})
  assert.equal(response.status, 200)
  assert.deepEqual(response.body, { ok: true })
  assert.equal(backend.rows[0].status, 'cancelled')
  assert.equal(backend.rows[1].status, 'scheduled')
})

for (const status of ['executing', 'completed', 'cancelled']) {
  test(`cancellation reports conflict for a ${status} request`, async () => {
    const row = { ...requestRow(status), status }
    const backend = createBackend([row])
    const cancellation = await instantiateCancellation(backend, cancellationSource)
    const response = await cancellation.DELETE({})
    assert.equal(response.status, 409)
    assert.equal(response.body.ok, undefined)
    assert.equal(backend.rows[0].status, status)
  })
}

test('cancellation reports conflict when no request exists', async () => {
  const backend = createBackend([])
  const cancellation = await instantiateCancellation(backend, cancellationSource)
  const response = await cancellation.DELETE({})
  assert.equal(response.status, 409)
})

test('cancellation database failure is reported', async () => {
  const backend = createBackend([requestRow('failure')])
  backend.service.from = () => {
    const query = {
      update: () => query, eq: () => query, select: () => query, maybeSingle: () => query,
      then: resolve => Promise.resolve(resolve({ data: null, error: { message: 'FAKE_DATABASE_FAILURE' } })),
    }
    return query
  }
  const cancellation = await instantiateCancellation(backend, cancellationSource)
  const response = await cancellation.DELETE({})
  assert.equal(response.status, 500)
  assert.deepEqual(response.body, { error: 'Annulation impossible.' })
  assert.equal(backend.rows[0].status, 'scheduled')
})

for (const data of [undefined, {}, { id: '' }]) {
  test(`cancellation does not accept an invalid receipt ${JSON.stringify(data)}`, async () => {
    const backend = createBackend([requestRow('bad-receipt')])
    backend.service.from = () => {
      const query = {
        update: () => query, eq: () => query, select: () => query, maybeSingle: () => query,
        then: resolve => Promise.resolve(resolve({ data, error: null })),
      }
      return query
    }
    const cancellation = await instantiateCancellation(backend, cancellationSource)
    const response = await cancellation.DELETE({})
    assert.equal(response.status, 500)
    assert.equal(response.body.ok, undefined)
  })
}

for (const [options, expectedStatus] of [[{ authorized: false }, 401], [{ allowed: false }, 429]]) {
  test(`cancellation ${expectedStatus} refuses before any database write`, async () => {
    const backend = createBackend([requestRow('refused')])
    const cancellation = await instantiateCancellation(backend, cancellationSource, options)
    const response = await cancellation.DELETE({})
    assert.equal(response.status, expectedStatus)
    assert.equal(backend.events.length, 0)
  })
}
