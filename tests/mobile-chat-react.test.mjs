import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mount, sseResponse, deferred, CASE_A, CASE_B } from './mobile-chat-react.fixture.mjs'

test('real React screen decodes text and reuses its dossier on a second send', async () => {
  const h = await mount()
  await h.input('Question A'); await h.press()
  assert.equal(h.state.requests.length, 1)
  assert.match(h.text(), /Question A|Réponse A/)
  assert.doesNotMatch(h.text(), /data:|case_created/)
  await h.input('Suite A'); await h.press()
  assert.equal(JSON.parse(h.state.requests[1].options.body).caseId, CASE_A)
})

test('StrictMode and two immediate clicks send only one request while session lookup is pending', async () => {
  const h = await mount({ strict: true }), pending = deferred()
  h.state.getSession = () => pending.promise
  await h.input('Une seule question'); await h.press('chat-send', 2)
  assert.equal(h.state.requests.length, 0)
  await h.settle(() => pending.resolve({ data: { session: h.state.currentSession }, error: null }))
  assert.equal(h.state.requests.length, 1)
  assert.equal(h.container.querySelectorAll('[data-message-id^="u-"]').length, 1)
})

test('actual auth-store account change unmounts the old conversation before token lookup settles', async () => {
  const h = await mount(), pending = deferred()
  h.state.getSession = () => pending.promise
  await h.input('Question privée A'); await h.press()
  await h.owner('owner-b')
  assert.doesNotMatch(h.text(), /Question privée A/)
  await h.settle(() => pending.resolve({ data: { session: { access_token: 'fixture-token-owner-a', user: { id: 'owner-a' } } }, error: null }))
  assert.equal(h.state.requests.length, 0)
  assert.doesNotMatch(h.text(), /Question privée A|Réponse A/)
})

test('account change cancels an active stream and the next owner gets a new dossier', async () => {
  const h = await mount(), response = sseResponse([{ type: 'case_created', caseId: CASE_A }, { type: 'text', content: 'Texte privé A' }], { open: true })
  h.state.fetch = () => Promise.resolve(response)
  await h.input('Question privée A'); await h.press()
  assert.match(h.text(), /Texte privé A/)
  const priorSignal = h.state.requests[0].options.signal
  await h.owner('owner-b')
  assert.equal(priorSignal.aborted, true)
  assert.equal(response.fixture.cancellations(), 1)
  assert.doesNotMatch(h.text(), /Texte privé A|Question privée A/)
  h.state.fetch = () => Promise.resolve(sseResponse([{ type: 'case_created', caseId: CASE_B }, { type: 'text', content: 'Réponse B' }, { type: 'done', caseId: CASE_B }]))
  await h.input('Question B'); await h.press()
  assert.deepEqual(JSON.parse(h.state.requests[1].options.body), { message: 'Question B' })
  assert.equal(h.state.requests[1].options.headers.Authorization, 'Bearer fixture-token-owner-b')
  assert.match(h.text(), /Réponse B/)
})

test('unmount while fetching cancels the request and discards a late successful response', async () => {
  const h = await mount(), pending = deferred()
  h.state.fetch = () => pending.promise
  await h.input('Question lente'); await h.press()
  const signal = h.state.requests[0].options.signal
  await h.unmount()
  assert.equal(signal.aborted, true)
  const late = sseResponse([{ type: 'case_created', caseId: CASE_A }, { type: 'text', content: 'Texte tardif' }, { type: 'done', caseId: CASE_A }], { open: true })
  await h.settle(() => pending.resolve(late))
  assert.equal(late.fixture.cancellations(), 1)
  assert.equal(h.container.textContent, '')
})

test('partial EOF preserves received text with an error and releases sending state', async () => {
  const h = await mount()
  h.state.fetch = () => Promise.resolve(sseResponse([{ type: 'case_created', caseId: CASE_A }, { type: 'text', content: 'Réponse partielle' }]))
  await h.input('Question'); await h.press()
  assert.match(h.text(), /Réponse partielle/)
  assert.match(h.query('chat-error').textContent, /interrompue/)
  await h.input('Suite')
  assert.equal(h.query('chat-send').disabled, false)
})

test('signed-out state clears account content and prevents transport', async () => {
  const h = await mount()
  await h.input('Question privée A'); await h.press()
  await h.settle(() => h.useAuth.getState().signOut())
  assert.doesNotMatch(h.text(), /Question privée A|Réponse A/)
  await h.input('Interdit sans session')
  assert.equal(h.query('chat-send').disabled, true)
  assert.equal(h.state.requests.length, 1)
})

test('explicit stop removes the pending placeholder and a late reply cannot overwrite a new answer', async () => {
  const h = await mount(), pending = deferred()
  h.state.fetch = () => pending.promise
  await h.input('Ancienne question'); await h.press()
  const oldSignal = h.state.requests[0].options.signal
  await h.press('chat-cancel')
  assert.equal(oldSignal.aborted, true)
  assert.equal(h.container.querySelector('[data-message-id="a-1"]'), null)
  assert.match(h.query('chat-error').textContent, /arrêtée/)
  h.state.fetch = () => Promise.resolve(sseResponse([{ type: 'case_created', caseId: CASE_B }, { type: 'text', content: 'Nouvelle réponse confirmée' }, { type: 'done', caseId: CASE_B }]))
  await h.input('Nouvelle question'); await h.press()
  const late = sseResponse([{ type: 'case_created', caseId: CASE_A }, { type: 'text', content: 'Réponse obsolète' }, { type: 'done', caseId: CASE_A }], { open: true })
  await h.settle(() => pending.resolve(late))
  assert.equal(late.fixture.cancellations(), 1)
  assert.match(h.text(), /Nouvelle réponse confirmée/)
  assert.doesNotMatch(h.text(), /Réponse obsolète/)
  assert.equal(h.query('chat-error'), null)
  await h.input('Suite du nouveau dossier')
  h.state.fetch = () => Promise.resolve(sseResponse([{ type: 'text', content: 'Suite' }, { type: 'done', caseId: CASE_B }]))
  await h.press()
  assert.equal(JSON.parse(h.state.requests[2].options.body).caseId, CASE_B)
})

test('explicit stop retains partial output as unconfirmed and cancels the active stream', async () => {
  const h = await mount(), response = sseResponse([{ type: 'case_created', caseId: CASE_A }, { type: 'text', content: 'Ébauche partielle' }], { open: true })
  h.state.fetch = () => Promise.resolve(response)
  await h.input('Question'); await h.press()
  await h.press('chat-cancel')
  assert.equal(response.fixture.cancellations(), 1)
  assert.match(h.text(), /Ébauche partielle/)
  assert.match(h.query('chat-error').textContent, /arrêtée.*reste à confirmer/)
  await h.input('Suite')
  assert.equal(h.query('chat-send').disabled, false)
})

test('the native deadline releases a stalled response and never clears a newer request', async () => {
  const h = await mount(), oldSession = deferred(), nextFetch = deferred()
  h.state.getSession = () => oldSession.promise
  await h.input('Ancienne question bloquée'); await h.press()
  const deadline = [...h.state.timers.entries()].find(([, timer]) => timer.delay === 130000)
  assert.ok(deadline, 'a native response deadline must exist')
  await h.settle(() => { h.state.timers.delete(deadline[0]); deadline[1].callback() })
  assert.match(h.query('chat-error').textContent, /délai.*dépassé/)
  assert.equal(h.container.querySelector('[data-message-id="a-1"]'), null)
  h.state.getSession = () => Promise.resolve({ data: { session: h.state.currentSession }, error: null })
  h.state.fetch = () => nextFetch.promise
  await h.input('Nouvelle demande'); await h.press()
  assert.equal(h.state.requests.length, 1)
  await h.settle(() => oldSession.resolve({ data: { session: h.state.currentSession }, error: null }))
  assert.ok(h.query('chat-cancel'), 'the late old session must not unlock the new request')
  assert.equal(h.query('chat-send').disabled, true)
  assert.equal(h.state.requests[0].options.signal.aborted, false)
  await h.settle(() => nextFetch.resolve(sseResponse([{ type: 'case_created', caseId: CASE_B }, { type: 'text', content: 'Nouvelle demande terminée' }, { type: 'done', caseId: CASE_B }])))
  assert.match(h.text(), /Nouvelle demande terminée/)
  assert.equal(h.query('chat-error'), null)
})

test('unmount clears the visible conversation and cancels an open response in StrictMode', async () => {
  const h = await mount({ strict: true }), response = sseResponse([{ type: 'case_created', caseId: CASE_A }, { type: 'text', content: 'Texte avant fermeture' }], { open: true })
  h.state.fetch = () => Promise.resolve(response)
  await h.input('Question'); await h.press()
  assert.match(h.text(), /Texte avant fermeture/)
  await h.unmount()
  assert.equal(h.state.requests[0].options.signal.aborted, true)
  assert.equal(response.fixture.cancellations(), 1)
  assert.equal(h.container.textContent, '')
})

test('an auth event during initialization wins over the older session snapshot', async () => {
  const pending = deferred()
  let context
  const boot = mount({ prepareAuth(value) {
    context = value
    value.state.getSession = () => pending.promise
  } })
  const newerSession = { access_token: 'fixture-token-owner-b', user: { id: 'owner-b' } }
  context.state.currentSession = newerSession
  for (const listener of context.state.authListeners) listener('SIGNED_IN', newerSession)
  pending.resolve({ data: { session: { access_token: 'fixture-token-owner-a', user: { id: 'owner-a' } } }, error: null })
  const h = await boot
  assert.equal(h.useAuth.getState().user.id, 'owner-b')
  assert.equal(h.useAuth.getState().session.access_token, 'fixture-token-owner-b')
  assert.equal(h.state.authListeners.size, 1)
})

test('concurrent initialization calls share one snapshot and one auth subscription', async () => {
  const pending = deferred()
  let context, snapshots = 0
  const boot = mount({ prepareAuth(value) {
    context = value
    value.state.getSession = () => { snapshots++; return pending.promise }
  } })
  const repeated = context.useAuth.getState().init()
  pending.resolve({ data: { session: context.state.currentSession }, error: null })
  const h = await boot
  await repeated
  assert.equal(snapshots, 1)
  assert.equal(h.state.authListeners.size, 1)
  await h.useAuth.getState().init()
  assert.equal(snapshots, 1)
  assert.equal(h.state.authListeners.size, 1)
})

test('a StrictMode recovery callback consumes its code once and reaches password entry', async () => {
  const pending = deferred()
  const h = await mount({ strict: true, owner: null, screen: 'mobile/app/auth/callback.tsx',
    linkedURL: 'jurispurama://auth/callback?flow=recovery&code=fixture-valid-code',
    prepareAuth({ state }) { state.exchange = () => pending.promise },
  })
  assert.equal(h.state.exchanges.length, 1)
  assert.equal(h.useAuth.getState().passwordRecovery.phase, 'exchanging')
  const recovered = { access_token: 'fixture-token-owner-a', refresh_token: 'fixture-refresh-a', user: { id: 'owner-a' } }
  await h.settle(() => pending.resolve({ data: { session: recovered, user: recovered.user }, error: null }))
  assert.equal(h.useAuth.getState().passwordRecovery.phase, 'ready')
  assert.deepEqual(h.state.routes, ['/(auth)/update-password'])
  assert.equal(h.state.exchanges.length, 1)
})

test('leaving a pending recovery callback prevents a late ready state or navigation', async () => {
  const pending = deferred()
  const h = await mount({ owner: null, screen: 'mobile/app/auth/callback.tsx',
    linkedURL: 'jurispurama://auth/callback?flow=recovery&code=fixture-valid-code',
    prepareAuth({ state }) { state.exchange = () => pending.promise },
  })
  await h.unmount()
  assert.equal(h.useAuth.getState().passwordRecovery, null)
  const recovered = { access_token: 'fixture-token-owner-a', refresh_token: 'fixture-refresh-a', user: { id: 'owner-a' } }
  await h.settle(() => pending.resolve({ data: { session: recovered, user: recovered.user }, error: null }))
  assert.equal(h.useAuth.getState().passwordRecovery, null)
  assert.deepEqual(h.state.routes, [])
})

test('an authenticated user can request another recovery link without a dashboard redirect', async () => {
  const h = await mount({ screen: 'mobile/app/_layout.tsx', segments: ['(auth)', 'forgot-password'] })
  assert.deepEqual(h.state.routes, [])
  assert.equal(h.useAuth.getState().user.id, 'owner-a')
})

test('a late isolated recovery exchange cannot replace a newer primary account', async () => {
  const pending = deferred()
  const h = await mount({ owner: null, screen: 'mobile/app/auth/callback.tsx',
    linkedURL: 'jurispurama://auth/callback?flow=recovery&code=fixture-valid-code',
    prepareAuth({ state }) { state.exchange = () => pending.promise },
  })
  await h.owner('owner-b')
  const recovered = { access_token: 'fixture-token-owner-a', refresh_token: 'fixture-refresh-a', user: { id: 'owner-a' } }
  await h.settle(() => pending.resolve({ data: { session: recovered, user: recovered.user }, error: null }))
  assert.equal(h.useAuth.getState().user.id, 'owner-b')
  assert.equal(h.state.currentSession.user.id, 'owner-b')
  assert.equal(h.useAuth.getState().passwordRecovery, null)
  assert.deepEqual(h.state.routes, [])
})

test('StrictMode callback hands recovery to the actual form and a double submit updates once', async () => {
  const recovered = { access_token: 'fixture-token-owner-a', refresh_token: 'fixture-refresh-a', user: { id: 'owner-a' } }
  const h = await mount({ strict: true, owner: null, screen: 'mobile/app/auth/callback.tsx',
    linkedURL: 'jurispurama://auth/callback?flow=recovery&code=fixture-valid-code',
    prepareAuth({ state }) { state.exchange = async () => ({ data: { session: recovered }, error: null }) },
  })
  await h.navigate('mobile/app/(auth)/update-password.tsx', ['(auth)', 'update-password'])
  assert.equal(h.useAuth.getState().passwordRecovery.phase, 'ready')
  assert.equal(h.useAuth.getState().session, null)
  await h.input('fixture-password-only', 'update-password')
  await h.input('fixture-password-only', 'update-password-confirm')
  await h.press('update-password-submit', 2)
  assert.deepEqual(h.state.updates, [{ password: 'fixture-password-only', userId: 'owner-a' }])
  assert.equal(h.state.alerts.length, 1)
  assert.equal(h.useAuth.getState().passwordRecovery, null)
  assert.equal(h.useAuth.getState().session, null)
  assert.deepEqual(h.state.routes, ['/(auth)/update-password', '/(auth)/login'])
})

test('leaving the update form clears recovery and ignores an already dispatched late response', async () => {
  const pending = deferred()
  const recovered = { access_token: 'fixture-token-owner-a', refresh_token: 'fixture-refresh-a', user: { id: 'owner-a' } }
  const h = await mount({ owner: null, screen: 'mobile/app/auth/callback.tsx',
    linkedURL: 'jurispurama://auth/callback?flow=recovery&code=fixture-valid-code',
    prepareAuth({ state }) {
      state.exchange = async () => ({ data: { session: recovered }, error: null })
      state.update = () => pending.promise
    },
  })
  await h.navigate('mobile/app/(auth)/update-password.tsx', ['(auth)', 'update-password'])
  await h.input('fixture-password-only', 'update-password')
  await h.input('fixture-password-only', 'update-password-confirm')
  await h.press('update-password-submit')
  assert.equal(h.state.updates.length, 1)
  await h.unmount()
  assert.equal(h.useAuth.getState().passwordRecovery, null)
  await h.settle(() => pending.resolve({ data: { user: recovered.user }, error: null }))
  assert.equal(h.state.alerts.length, 0)
  assert.deepEqual(h.state.routes, ['/(auth)/update-password'])
  assert.equal(h.state.currentSession, null)
})
