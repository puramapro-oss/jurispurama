import assert from 'node:assert/strict'
import { test } from 'node:test'
import { button, renderedText } from './mobile-contract-harness.mjs'
import { fixture, tick, deferred, OWNER_A, OWNER_B, CODE, user, subject, json } from './mobile-recovery-harness.mjs'

test('native reset screen sends its native callback with the real SDK PKCE challenge', async () => {
  const f = await fixture(), view = f.mountScreen('mobile/app/(auth)/forgot-password.tsx')
  let tree = await view.mount()
  button(tree, 'forgot-email').props.onChangeText('  Fixture@Example.invalid  ')
  tree = view.render()
  const press = button(tree, 'forgot-submit').props.onPress
  await Promise.all([press(), press()])
  const recover = f.state.requests.filter(entry => entry.path === '/auth/v1/recover')
  assert.equal(recover.length, 1)
  assert.equal(recover[0].body.email, 'fixture@example.invalid')
  assert.equal(recover[0].url.searchParams.get('redirect_to'), f.helper.PASSWORD_RECOVERY_REDIRECT)
  assert.ok(recover[0].body.code_challenge)
  assert.equal(recover[0].body.code_challenge_method, 's256')
  assert.equal(view.state.alerts.length, 1)
  assert.match(view.state.alerts[0][1], /cet appareil/)
  view.unmount()
})

test('real SDK cannot exchange on another storage owner, then the actual native callback succeeds', async () => {
  const f = await fixture(), other = await fixture()
  await f.helper.requestPasswordRecovery('fixture@example.invalid')
  await assert.rejects(other.helper.exchangeRecoveryCode(CODE, () => true), /Lien invalide/)
  assert.equal(other.state.requests.length, 0)
  const url = `${f.helper.PASSWORD_RECOVERY_REDIRECT}&code=${CODE}`
  const view = f.mountScreen('mobile/app/auth/callback.tsx', {
    'expo-linking': { useURL: () => url, getInitialURL: async () => url },
  })
  await view.mount(); await tick()
  assert.equal(f.useAuth.getState().passwordRecovery.phase, 'ready')
  assert.equal(f.useAuth.getState().passwordRecovery.userId, OWNER_A)
  assert.deepEqual(f.routes, ['/(auth)/update-password'])
  assert.equal(f.state.requests.filter(entry => entry.path === '/auth/v1/token').length, 1)
  view.unmount()
})

test('native callback validates scheme, origin, path, duplicate parameters and code before auth', async () => {
  const f = await fixture()
  assert.equal(f.helper.parseRecoveryCode(`${f.helper.PASSWORD_RECOVERY_REDIRECT}&code=${CODE}`), CODE)
  for (const url of [null, '', 'not a URL', `https://evil.example/auth/callback?flow=recovery&code=${CODE}`,
    `https://jurispurama.purama.dev/auth/callback?flow=recovery&code=${CODE}`,
    `otherapp://auth/callback?flow=recovery&code=${CODE}`, `jurispurama://other/callback?flow=recovery&code=${CODE}`,
    `jurispurama://auth/other?flow=recovery&code=${CODE}`, `jurispurama://user@auth/callback?flow=recovery&code=${CODE}`,
    `${f.helper.PASSWORD_RECOVERY_REDIRECT}&code=${CODE}&code=${CODE}`,
    `${f.helper.PASSWORD_RECOVERY_REDIRECT}&code=${CODE}&next=https://evil.example`,
    `${f.helper.PASSWORD_RECOVERY_REDIRECT}&code=${CODE}#access_token=bad`,
    `${f.helper.PASSWORD_RECOVERY_REDIRECT}&error=expired`, `${f.helper.PASSWORD_RECOVERY_REDIRECT}&code=short`]) {
    assert.throws(() => f.helper.parseRecoveryCode(url), /Lien invalide/)
  }
  assert.equal(f.state.requests.length, 0)
})

test('invalid or consumed PKCE code cannot create a recovery form', async () => {
  const f = await fixture()
  await f.helper.requestPasswordRecovery('fixture@example.invalid')
  f.state.badCode = true
  const url = `${f.helper.PASSWORD_RECOVERY_REDIRECT}&code=${CODE}`
  const view = f.mountScreen('mobile/app/auth/callback.tsx', {
    'expo-linking': { useURL: () => url, getInitialURL: async () => url },
  })
  await view.mount(); await tick()
  assert.equal(f.useAuth.getState().passwordRecovery, null)
  assert.deepEqual(f.routes, [])
  assert.match(renderedText(view.render()), /Lien invalide/)
  view.unmount()
})

test('actual password screen updates through the real isolated SDK and keeps shared storage unchanged', async () => {
  const f = await fixture(), expected = await f.ready()
  const before = [...f.storage]
  const view = f.mountScreen('mobile/app/(auth)/update-password.tsx')
  let tree = await view.mount()
  button(tree, 'update-password').props.onChangeText('A-long-fixture-password-123!')
  button(tree, 'update-password-confirm').props.onChangeText('A-long-fixture-password-123!')
  tree = view.render()
  const press = button(tree, 'update-password-submit').props.onPress
  await Promise.all([press(), press()])
  assert.equal(f.updates().length, 1)
  assert.equal(f.updates()[0].token, expected.accessToken)
  assert.equal(f.updates()[0].body.password, 'A-long-fixture-password-123!')
  assert.deepEqual([...f.storage], before)
  assert.equal(f.state.creations[1].auth.persistSession, false)
  assert.equal(f.state.creations[1].auth.autoRefreshToken, false)
  assert.equal(f.state.creations[1].auth.detectSessionInUrl, false)
  assert.equal(view.state.alerts[0][0], 'Mot de passe modifié')
  assert.equal(f.useAuth.getState().passwordRecovery, null)
  assert.deepEqual(f.routes, ['/(tabs)/dashboard'])
  view.unmount()
})

test('password mismatch or short input cannot call updateUser', async () => {
  const f = await fixture(); await f.ready()
  const view = f.mountScreen('mobile/app/(auth)/update-password.tsx')
  let tree = await view.mount()
  button(tree, 'update-password').props.onChangeText('short')
  button(tree, 'update-password-confirm').props.onChangeText('short')
  await button(view.render(), 'update-password-submit').props.onPress()
  assert.match(button(view.render(), 'update-password').props.error, /8 caractères/)
  button(view.render(), 'update-password').props.onChangeText('long-enough-password')
  button(view.render(), 'update-password-confirm').props.onChangeText('different-long-password')
  await button(view.render(), 'update-password-submit').props.onPress()
  assert.match(button(view.render(), 'update-password').props.error, /correspondent/)
  assert.equal(f.updates().length, 0)
  view.unmount()
})

test('real updateUser HTTP error is visible, unlocks the form and can be retried', async () => {
  const f = await fixture(); await f.ready()
  f.state.put = () => json({ code: 'weak_password', msg: 'Password rejected' }, 422)
  const view = f.mountScreen('mobile/app/(auth)/update-password.tsx')
  let tree = await view.mount()
  button(tree, 'update-password').props.onChangeText('long-enough-password')
  button(tree, 'update-password-confirm').props.onChangeText('long-enough-password')
  await button(view.render(), 'update-password-submit').props.onPress()
  assert.equal(f.updates().length, 1)
  assert.equal(button(view.render(), 'update-password-submit').props.loading, false)
  assert.match(button(view.render(), 'update-password').props.error, /Modification impossible/)
  assert.deepEqual(f.routes, [])
  f.state.put = null
  await button(view.render(), 'update-password-submit').props.onPress()
  assert.equal(f.updates().length, 2)
  assert.deepEqual(f.routes, ['/(tabs)/dashboard'])
  view.unmount()
})

test('untrusted or rejected getUser results prevent any password mutation', async () => {
  for (const response of [() => json(user(OWNER_B)), () => json({ msg: 'Expired', code: 'bad_jwt' }, 401)]) {
    const f = await fixture(), expected = await f.ready()
    f.state.get = response
    await assert.rejects(f.helper.updateRecoveryPassword(f.supabase, 'long-enough-password', expected, () => true), /session a changé/)
    assert.equal(f.updates().length, 0)
  }
})

test('account change while the remote identity is being validated prevents updateUser', async () => {
  const f = await fixture(), expected = await f.ready(), pending = deferred()
  f.state.get = entry => subject(entry.token) === OWNER_A ? pending.promise : json(user(OWNER_B))
  const operation = f.helper.updateRecoveryPassword(f.supabase, 'long-enough-password', expected, () => true)
  await tick()
  await f.signIn(OWNER_B)
  pending.resolve(json(user(OWNER_A)))
  await assert.rejects(operation, /session a changé/)
  assert.equal(f.updates().length, 0)
  assert.equal((await f.supabase.auth.getSession()).data.session.user.id, OWNER_B)
})

test('a different session of the same account is rejected before any mutation', async () => {
  const f = await fixture(), expected = await f.ready()
  await f.signIn(OWNER_A, 2)
  await assert.rejects(f.helper.updateRecoveryPassword(f.supabase, 'long-enough-password', expected, () => true), /session a changé/)
  assert.equal(f.updates().length, 0)
})

test('account change during the real updateUser HTTP call cannot redirect it or overwrite the new shared session', async () => {
  const f = await fixture(), expected = await f.ready()
  f.state.put = async entry => {
    assert.equal(entry.token, expected.accessToken)
    await f.signIn(OWNER_B)
    return json(user(OWNER_A))
  }
  await assert.rejects(f.helper.updateRecoveryPassword(f.supabase, 'long-enough-password', expected, () => true), /session a changé/)
  assert.equal(f.updates().length, 1)
  assert.equal(subject(f.updates()[0].token), OWNER_A)
  assert.equal((await f.supabase.auth.getSession()).data.session.user.id, OWNER_B)
  assert.equal(f.useAuth.getState().user.id, OWNER_B)
  assert.equal(f.useAuth.getState().passwordRecovery, null)
})

test('unmount while updating suppresses all late navigation and success feedback', async () => {
  const f = await fixture(); await f.ready()
  const pending = deferred()
  f.state.put = () => pending.promise
  const view = f.mountScreen('mobile/app/(auth)/update-password.tsx')
  let tree = await view.mount()
  button(tree, 'update-password').props.onChangeText('long-enough-password')
  button(tree, 'update-password-confirm').props.onChangeText('long-enough-password')
  const operation = button(view.render(), 'update-password-submit').props.onPress()
  await tick()
  assert.equal(f.updates().length, 1)
  view.unmount()
  pending.resolve(json(user(OWNER_A)))
  await operation
  assert.equal(view.state.alerts.length, 0)
  assert.deepEqual(f.routes, [])
})

test('missing recovery session renders a restart action and never exposes a password submit', async () => {
  const f = await fixture({ signedIn: true }), view = f.mountScreen('mobile/app/(auth)/update-password.tsx')
  const tree = await view.mount()
  assert.match(renderedText(tree), /session de réinitialisation/)
  await button(tree, 'update-password-restart').props.onPress()
  assert.deepEqual(f.routes, ['/(auth)/forgot-password'])
  assert.equal(f.updates().length, 0)
  view.unmount()
})
