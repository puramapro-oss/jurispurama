import assert from 'node:assert/strict'
import { test } from 'node:test'
import { button, renderedText } from './mobile-contract-harness.mjs'
import { fixture, tick, deferred, OWNER_A, OWNER_B, CODE, user, json, authResponse } from './mobile-recovery-harness.mjs'

async function callback(f) {
  const url = `${f.helper.PASSWORD_RECOVERY_REDIRECT}&code=${CODE}`
  const view = f.mountScreen('mobile/app/auth/callback.tsx', {
    'expo-linking': { useURL: () => url, getInitialURL: async () => url },
  })
  await view.mount(); await tick()
  return view
}

test('cold native callback owns the stored verifier, keeps the login signed out and updates from its memory-only session', async () => {
  const f = await fixture()
  await f.helper.requestPasswordRecovery('fixture@example.invalid')
  assert.deepEqual([...f.storage.keys()], ['jurispurama-password-recovery-code-verifier'])
  const cb = await callback(f)
  const recovery = f.useAuth.getState().passwordRecovery
  assert.equal(recovery.phase, 'ready')
  assert.equal((await f.supabase.auth.getSession()).data.session, null)
  assert.equal(f.useAuth.getState().session, null)
  assert.equal((await recovery.client.auth.getSession()).data.session.user.id, OWNER_A)
  assert.deepEqual([...f.storage], [])
  // A fresh client after a restart cannot recover session tokens from disk.
  assert.equal((await f.createPasswordRecoveryClient().auth.getSession()).data.session, null)
  cb.unmount(); await tick()
  assert.equal(f.useAuth.getState().passwordRecovery?.phase, 'ready', 'the callback must preserve the session handed off to the update screen')

  const view = f.mountScreen('mobile/app/(auth)/update-password.tsx')
  let tree = await view.mount()
  button(tree, 'update-password').props.onChangeText('new-password-fixture-123')
  button(tree, 'update-password-confirm').props.onChangeText('new-password-fixture-123')
  await button(view.render(), 'update-password-submit').props.onPress()
  assert.equal(f.updates().length, 1)
  assert.equal(f.updates()[0].token, recovery.accessToken)
  assert.deepEqual(f.routes, ['/(auth)/update-password', '/(auth)/login'])
  assert.equal(f.useAuth.getState().passwordRecovery, null)
  assert.equal((await f.supabase.auth.getSession()).data.session, null)
  assert.deepEqual([...f.storage], [])
  view.unmount(); cb.unmount()
})

test('an obsolete real SDK code exchange never overwrites the account that signed in while it was pending', async () => {
  const f = await fixture(), pending = deferred()
  await f.helper.requestPasswordRecovery('fixture@example.invalid')
  f.state.exchange = () => pending.promise
  const view = await callback(f)
  assert.equal(f.useAuth.getState().passwordRecovery.phase, 'exchanging')
  await f.signIn(OWNER_B)
  pending.resolve(authResponse()); await tick()
  assert.equal(f.useAuth.getState().passwordRecovery, null)
  assert.equal(f.useAuth.getState().user.id, OWNER_B)
  assert.equal((await f.supabase.auth.getSession()).data.session.user.id, OWNER_B)
  assert.deepEqual(f.routes, [])
  assert.match(renderedText(view.render()), /session modifiée/)
  assert.ok(![...f.storage].some(([key, value]) => key.includes('password-recovery') && value.includes('access_token')))
  view.unmount()
})

test('leaving while real SDK exchange is pending suppresses navigation and stores no shared login', async () => {
  const f = await fixture(), pending = deferred()
  await f.helper.requestPasswordRecovery('fixture@example.invalid')
  f.state.exchange = () => pending.promise
  const view = await callback(f)
  view.unmount(); await tick()
  assert.equal(f.useAuth.getState().passwordRecovery, null)
  pending.resolve(authResponse()); await tick()
  assert.equal(f.useAuth.getState().passwordRecovery, null)
  assert.equal((await f.supabase.auth.getSession()).data.session, null)
  assert.deepEqual(f.routes, [])
  assert.deepEqual([...f.storage], [])
})

test('a late abandoned exchange cannot remove the verifier of a newer reset request', async () => {
  const f = await fixture(), pending = deferred()
  await f.helper.requestPasswordRecovery('fixture@example.invalid')
  f.state.exchange = () => pending.promise
  const old = await callback(f)
  old.unmount(); await tick()
  await f.helper.requestPasswordRecovery('fixture@example.invalid')
  const newerVerifier = [...f.storage]
  pending.resolve(authResponse()); await tick()
  assert.deepEqual([...f.storage], newerVerifier)
  f.state.exchange = null
  const current = await callback(f)
  assert.equal(f.useAuth.getState().passwordRecovery.phase, 'ready')
  assert.deepEqual(f.routes, ['/(auth)/update-password'])
  assert.deepEqual([...f.storage], [])
  current.unmount()
})

test('changing the main account during a native password update keeps the new account and suppresses old feedback', async () => {
  const f = await fixture(), pending = deferred()
  await f.helper.requestPasswordRecovery('fixture@example.invalid')
  const cb = await callback(f)
  const recovery = f.useAuth.getState().passwordRecovery
  f.state.put = () => pending.promise
  const view = f.mountScreen('mobile/app/(auth)/update-password.tsx')
  let tree = await view.mount()
  button(tree, 'update-password').props.onChangeText('new-password-fixture-123')
  button(tree, 'update-password-confirm').props.onChangeText('new-password-fixture-123')
  const operation = button(view.render(), 'update-password-submit').props.onPress()
  await tick()
  assert.equal(f.updates()[0].token, recovery.accessToken)
  await f.signIn(OWNER_B)
  tree = view.render()
  assert.match(renderedText(tree), /session de réinitialisation/)
  await view.flushEffects()
  pending.resolve(json(user(OWNER_A))); await operation
  assert.equal(view.state.alerts.length, 0)
  assert.deepEqual(f.routes, ['/(auth)/update-password'])
  assert.equal((await f.supabase.auth.getSession()).data.session.user.id, OWNER_B)
  view.unmount(); cb.unmount()
})

test('the Expo web screen hands off to the existing browser recovery without producing a native PKCE email', async () => {
  const f = await fixture(), opened = []
  const view = f.mountScreen('mobile/app/(auth)/forgot-password.tsx', {
    'react-native': { Text: 'Text', View: 'View', Alert: { alert() {} }, Platform: { OS: 'web' },
      Linking: { openURL: async url => { opened.push(url) } } },
  })
  const tree = await view.mount()
  await button(tree, 'forgot-web').props.onPress()
  assert.deepEqual(opened, ['https://jurispurama.purama.dev/forgot-password'])
  assert.equal(f.state.requests.length, 0)
  view.unmount()
})

for (const action of ['cancel', 'close']) {
  test(`${action} of the update form releases the temporary recovery session without changing a password`, async () => {
    const f = await fixture()
    await f.helper.requestPasswordRecovery('fixture@example.invalid')
    const cb = await callback(f)
    cb.unmount(); await tick()
    const view = f.mountScreen('mobile/app/(auth)/update-password.tsx')
    const tree = await view.mount()
    if (action === 'cancel') await button(tree, 'update-password-cancel').props.onPress()
    view.unmount(); await tick()
    assert.equal(f.useAuth.getState().passwordRecovery, null)
    assert.equal(f.updates().length, 0)
    assert.equal((await f.supabase.auth.getSession()).data.session, null)
    assert.deepEqual([...f.storage], [])
  })
}
