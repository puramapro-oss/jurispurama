import assert from 'node:assert/strict'
import { test } from 'node:test'
import { randomUUID } from 'node:crypto'
import { button, fixtureCase, nodes, renderedText, request, route, screen } from './mobile-contract-harness.mjs'

const subscriptionScreen = 'mobile/app/(tabs)/abonnement.tsx'
const caseScreen = 'mobile/app/(tabs)/dossiers.tsx'
const checkoutPath = 'src/app/api/stripe/checkout/route.ts'

const deferred = () => {
  let resolve, reject
  const promise = new Promise((ok, fail) => { resolve = ok; reject = fail })
  return { promise, resolve, reject }
}
const flush = () => new Promise(resolve => setImmediate(resolve))

for (const plan of ['essentiel', 'pro', 'avocat_virtuel']) {
  test(`actual mobile ${plan} checkout passes the actual API contract with a user Bearer`, async () => {
    const server = route(checkoutPath)
    const client = screen(subscriptionScreen, { api: async (path, init) => {
      const response = await server.handler.POST(request(path, {
        method: init.method, body: JSON.parse(init.body), authorization: 'Bearer fixture.token',
      }))
      assert.equal(response.status, 200)
      return response.json()
    } })
    await button(client.render(), `plan-cta-${plan}`).props.onPress()
    assert.equal(server.calls.stripe.length, 1)
    assert.equal(server.calls.stripe[0].payload.metadata.plan, plan)
    assert.equal(server.calls.stripe[0].payload.metadata.billing, 'monthly')
    assert.match(server.calls.stripe[0].options.idempotencyKey, /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i)
    assert.equal(client.state.opened.length, 1)
  })
}

test('mobile displays the existing canonical plan prices and descriptions', () => {
  const tree = screen(subscriptionScreen).render()
  const expected = { essentiel: '9,99', pro: '19,99', avocat_virtuel: '39,99' }
  for (const [id, price] of Object.entries(expected)) {
    const card = button(tree, `plan-${id}`)
    assert.ok(renderedText(card).includes(price), `${id} shows ${price}`)
  }
  assert.ok(renderedText(tree).includes('Premium'))
  assert.doesNotMatch(renderedText(tree), /79,99|29,99|20 questions|Multi-utilisateurs|Account manager/)
})

test('a lost checkout response keeps one intention key; changing plan or user creates a new key', async () => {
  const client = screen(subscriptionScreen, { api: async () => { throw new Error('Response lost') } })
  await button(client.render(), 'plan-cta-pro').props.onPress()
  await button(client.render(), 'plan-cta-pro').props.onPress()
  await button(client.render(), 'plan-cta-essentiel').props.onPress()
  client.state.userId = 'different-user'
  await button(client.render(), 'plan-cta-essentiel').props.onPress()
  const requests = client.state.requests.map(call => JSON.parse(call.body))
  assert.match(requests[0].idempotencyKey, /^[a-f0-9-]{36}$/)
  assert.equal(requests[0].idempotencyKey, requests[1].idempotencyKey)
  assert.notEqual(requests[1].idempotencyKey, requests[2].idempotencyKey)
  assert.notEqual(requests[2].idempotencyKey, requests[3].idempotencyKey)
})

test('synchronous double clicks across plans admit a single request before the rerender', async () => {
  let finish
  const pending = new Promise(resolve => { finish = resolve })
  const client = screen(subscriptionScreen, { api: () => pending })
  const tree = client.render()
  const first = button(tree, 'plan-cta-pro').props.onPress()
  const second = button(tree, 'plan-cta-essentiel').props.onPress()
  assert.equal(client.state.requests.length, 1)
  const rerender = client.render()
  assert.equal(button(rerender, 'plan-cta-essentiel').props.disabled, true)
  finish({ url: 'https://checkout.stripe.com/c/pay/fixture' })
  await Promise.all([first, second])
  assert.equal(client.state.opened.length, 1)
})

test('failing to open the browser retains the same checkout key on retry', async () => {
  const client = screen(subscriptionScreen, { api: async () => ({ url: 'https://checkout.stripe.com/c/pay/fixture' }),
    openURL: async () => { throw new Error('Browser unavailable') } })
  await button(client.render(), 'plan-cta-pro').props.onPress()
  await button(client.render(), 'plan-cta-pro').props.onPress()
  const keys = client.state.requests.map(call => JSON.parse(call.body).idempotencyKey)
  assert.match(keys[0], /^[a-f0-9-]{36}$/)
  assert.equal(keys[0], keys[1])
})

test('actual dossiers list renders summary and all canonical statuses', async () => {
  const labels = { diagnostic: 'Diagnostic', analyse: 'Analyse', document_pret: 'Document prêt',
    signe: 'Signé', envoye: 'Envoyé', en_attente: 'En attente', resolu: 'Résolu' }
  const client = screen(caseScreen, { api: async () => ({ cases: Object.keys(labels).map(status => ({ ...fixtureCase, id: status, status })) }) })
  const tree = await client.mount()
  const list = nodes(tree).find(node => node.type === 'FlatList')
  for (const item of list.props.data) {
    const text = renderedText(list.props.renderItem({ item }))
    assert.ok(text.includes(item.summary))
    assert.ok(text.includes(labels[item.status]))
  }
})

for (const id of ['plan-cta-pro', 'abo-portal']) {
  test(`${id} discards a late checkout or portal URL after the account changes`, async () => {
    const pending = deferred()
    const client = screen(subscriptionScreen, { api: () => pending.promise })
    const tree = await client.mount()
    const oldAction = button(tree, id).props.onPress()
    client.state.userId = 'other-account'
    client.render()
    await client.flushEffects()
    assert.equal(client.state.requests[0].signal.aborted, true)
    pending.resolve({ url: 'https://checkout.stripe.com/c/pay/old-account' })
    await oldAction
    assert.equal(client.state.opened.length, 0)
    assert.equal(client.state.alerts.length, 0)
  })
  test(`${id} aborts on unmount and suppresses a late error or fallback browser`, async () => {
    const pending = deferred()
    const client = screen(subscriptionScreen, { api: () => pending.promise })
    const tree = await client.mount()
    const action = button(tree, id).props.onPress()
    client.unmount()
    pending.reject(new Error('Late network failure'))
    await action
    assert.equal(client.state.requests[0].signal.aborted, true)
    assert.equal(client.state.opened.length, 0)
    assert.equal(client.state.alerts.length, 0)
  })
}

test('an old checkout completion cannot unlock the new account request', async () => {
  const old = deferred(), current = deferred()
  let calls = 0
  const client = screen(subscriptionScreen, { api: () => (++calls === 1 ? old.promise : current.promise) })
  const oldAction = button(await client.mount(), 'plan-cta-pro').props.onPress()
  client.state.userId = 'other-account'
  client.render()
  await client.flushEffects()
  const nextAction = button(client.render(), 'plan-cta-essentiel').props.onPress()
  old.resolve({ url: 'https://checkout.stripe.com/c/pay/old' })
  await oldAction
  assert.equal(button(client.render(), 'plan-cta-pro').props.disabled, true)
  current.resolve({ url: 'https://checkout.stripe.com/c/pay/current' })
  await nextAction
  assert.deepEqual(client.state.opened, ['https://checkout.stripe.com/c/pay/current'])
})

test('dossiers are hidden immediately at account change and a stale response cannot replace new data', async () => {
  const old = deferred(), current = deferred()
  let calls = 0
  const client = screen(caseScreen, { api: () => (++calls === 1 ? old.promise : current.promise) })
  await client.mount()
  client.state.userId = 'other-account'
  assert.equal(nodes(client.render()).some(node => node.type === 'FlatList'), false)
  await client.flushEffects()
  assert.equal(client.state.requests[0].signal.aborted, true)
  current.resolve({ cases: [{ ...fixtureCase, summary: 'Current account only' }] })
  await flush()
  old.resolve({ cases: [{ ...fixtureCase, summary: 'Previous account private case' }] })
  await flush()
  const list = nodes(client.render()).find(node => node.type === 'FlatList')
  assert.deepEqual(list.props.data.map(row => row.summary), ['Current account only'])
})

test('dossiers clear loaded data before refetch when the account changes, including signed out', async () => {
  const client = screen(caseScreen, { api: async () => ({ cases: [fixtureCase] }) })
  await client.mount()
  assert.equal(nodes(client.render()).find(node => node.type === 'FlatList').props.data.length, 1)
  client.state.userId = null
  assert.equal(nodes(client.render()).find(node => node.type === 'FlatList').props.data.length, 0)
  await client.flushEffects()
  const list = nodes(client.render()).find(node => node.type === 'FlatList')
  assert.equal(list.props.data.length, 0)
  assert.equal(client.state.requests.length, 1, 'no anonymous dossier request')
})

const endpoints = [
  ['cases read', 'src/app/api/cases/route.ts', 'GET', '/api/cases', undefined, 200],
  ['case create', 'src/app/api/cases/route.ts', 'POST', '/api/cases', { type: 'travail', summary: 'Fixture' }, 201],
  ['checkout', checkoutPath, 'POST', '/api/stripe/checkout', { plan: 'pro', billing: 'monthly', idempotencyKey: randomUUID() }, 200],
  ['portal status', 'src/app/api/stripe/portal/route.ts', 'GET', '/api/stripe/portal?action=status', undefined, 200],
  ['portal open', 'src/app/api/stripe/portal/route.ts', 'POST', '/api/stripe/portal', undefined, 200],
]
for (const [name, file, method, path, body, expected] of endpoints) {
  for (const mode of ['cookie', 'bearer']) {
    test(`${name} preserves ${mode} authentication and user ownership`, async () => {
      const server = route(file, { hasCookie: mode === 'cookie' })
      const response = await server.handler[method](request(path, { method, body,
        authorization: mode === 'bearer' ? 'Bearer fixture.token' : undefined }))
      assert.equal(response.status, expected)
      assert.deepEqual(server.calls.userTokens, [mode === 'bearer' ? 'fixture.token' : undefined])
      assert.ok(server.calls.queries[0].filters.some(([field, value]) => field === 'auth_user_id' && value === 'user-fixture'))
      const cases = server.calls.queries.filter(query => query.table === 'jurispurama_cases')
      for (const query of cases) assert.ok(query.insert?.user_id === 'profile-fixture'
        || query.filters.some(([field, value]) => field === 'user_id' && value === 'profile-fixture'))
    })
  }
  test(`${name} rejects an explicit invalid Bearer instead of using a valid cookie`, async () => {
    const server = route(file, { hasCookie: true })
    const response = await server.handler[method](request(path, { method, body, authorization: 'Bearer ' }))
    assert.equal(response.status, 401)
    assert.equal(server.calls.queries.length, 0)
    assert.equal(server.calls.stripe.length, 0)
    assert.equal(server.calls.limits, 0)
  })
  test(`${name} rejects a getUser error before any data or payment effect`, async () => {
    const server = route(file, { hasCookie: true, authErrorWithUser: true })
    const response = await server.handler[method](request(path, { method, body }))
    assert.equal(response.status, 401)
    assert.equal(server.calls.queries.length, 0)
    assert.equal(server.calls.stripe.length, 0)
  })
}
