import assert from 'node:assert/strict'
import { test } from 'node:test'
import { deferred, mount, profileFor, sessionFor } from './web-auth-hook.fixture.mjs'

test('profile completion keeps one client and one subscription without effect resubscription', async () => {
  const h = await mount()
  assert.equal(h.current().profile.auth_user_id, 'owner-a')
  assert.equal(h.current().loading, false)
  assert.equal(h.state.clientCreations, 1)
  assert.equal(h.state.subscriptions, 1)
  assert.deepEqual(h.state.reads, ['owner-a'])
})

test('auth callbacks return synchronously and profile work starts outside the SDK callback', async () => {
  const h = await mount()
  await h.emit(sessionFor('owner-b'))
  assert.equal(h.state.callbackResults.every(result => result === undefined), true)
  assert.equal(h.state.queriesInsideCallback, 0)
  assert.equal(h.current().profile.auth_user_id, 'owner-b')
})

test('late profile A cannot replace current account B or expose the previous profile', async () => {
  const pending = deferred()
  const h = await mount({ prepare(state) {
    state.readProfile = id => id === 'owner-a' ? pending.promise : Promise.resolve({ data: profileFor(id), error: null })
  } })
  await h.emit(sessionFor('owner-b'))
  await h.settle(() => pending.resolve({ data: profileFor('owner-a'), error: null }))
  assert.equal(h.current().user.id, 'owner-b')
  assert.equal(h.current().profile.auth_user_id, 'owner-b')
  assert.equal(h.state.rendered.some(row => row.userId === 'owner-b' && row.profileOwner === 'owner-a'), false)
})

test('sign-out discards a pending previous profile and does not recreate it', async () => {
  const pending = deferred()
  const h = await mount({ prepare(state) { state.readProfile = () => pending.promise } })
  await h.emit(null, 'SIGNED_OUT')
  await h.settle(() => pending.resolve({ data: null, error: null }))
  assert.equal(h.current().user, null)
  assert.equal(h.current().profile, null)
  assert.equal(h.current().loading, false)
  assert.equal(h.state.inserts.length, 0)
})

test('a profile read failure never becomes a create-profile operation', async () => {
  const h = await mount({ prepare(state) {
    state.readProfile = async () => ({ data: null, error: { message: 'temporary failure' } })
  } })
  assert.equal(h.state.inserts.length, 0)
  assert.equal(h.current().profile, null)
  assert.equal(h.current().loading, false)
})

test('unmount before a missing-profile result prevents later database writes', async () => {
  const pending = deferred()
  const h = await mount({ prepare(state) { state.readProfile = () => pending.promise } })
  await h.unmount()
  await h.settle(() => pending.resolve({ data: null, error: null }))
  assert.equal(h.state.inserts.length, 0)
  assert.equal(h.state.listeners.size, 0)
  assert.equal(h.container.textContent, '')
})

test('token refresh updates the session without refetching the same profile', async () => {
  const h = await mount()
  await h.emit(sessionFor('owner-a', 'refreshed-token-a'), 'TOKEN_REFRESHED')
  assert.equal(h.current().session.access_token, 'refreshed-token-a')
  assert.equal(h.current().profile.auth_user_id, 'owner-a')
  assert.deepEqual(h.state.reads, ['owner-a'])
  assert.equal(h.state.listeners.size, 1)
})

test('a more recent auth event supersedes a delayed initialization snapshot', async () => {
  const pending = deferred()
  const h = await mount({ prepare(state) { state.initialGate = pending } })
  await h.emit(sessionFor('owner-b'))
  await h.settle(() => pending.resolve({ data: { session: sessionFor('owner-a') }, error: null }))
  assert.equal(h.current().user.id, 'owner-b')
  assert.equal(h.current().profile.auth_user_id, 'owner-b')
})

test('a confirmed missing profile is created with the existing default fields', async () => {
  const h = await mount({ prepare(state) { state.readProfile = async () => ({ data: null, error: null }) } })
  assert.equal(h.state.inserts.length, 1)
  const inserted = h.state.inserts[0]
  assert.equal(inserted.auth_user_id, 'owner-a')
  assert.equal(inserted.role, 'user')
  assert.equal(inserted.subscription_plan, 'free')
  assert.equal(inserted.language, 'fr')
  assert.equal(inserted.referral_code.length, 8)
  assert.equal(h.current().profile.auth_user_id, 'owner-a')
})

test('a concurrent profile creator is recovered by rereading the existing row', async () => {
  const h = await mount({ prepare(state) {
    let read = 0
    state.readProfile = async id => ({ data: ++read === 1 ? null : profileFor(id), error: null })
    state.insertProfile = async () => ({ data: null, error: { code: '23505' } })
  } })
  assert.equal(h.state.inserts.length, 1)
  assert.equal(h.current().profile?.auth_user_id, 'owner-a')
  assert.equal(h.current().loading, false)
})

test('StrictMode preserves one active subscription and does not duplicate profile creation', async () => {
  const h = await mount({ strict: true, prepare(state) { state.readProfile = async () => ({ data: null, error: null }) } })
  assert.equal(h.state.listeners.size, 1)
  assert.equal(h.state.inserts.length, 1)
  await h.unmount()
  assert.equal(h.state.listeners.size, 0)
})

test('the hook retains its password recovery redirect to the new form', async () => {
  const h = await mount({ session: null })
  await h.current().resetPassword('fixture@example.invalid')
  assert.deepEqual(h.state.resets, [{ email: 'fixture@example.invalid', options: {
    redirectTo: 'https://juris.fixture.invalid/auth/callback?next=/update-password',
  } }])
})

test('a rejected initial session settles loading without inventing a user', async () => {
  const h = await mount({ prepare(state) { state.snapshotError = new Error('session unavailable') } })
  assert.equal(h.current().loading, false)
  assert.equal(h.current().user, null)
  assert.equal(h.current().profile, null)
  assert.equal(h.state.inserts.length, 0)
})

test('a rejected profile read settles loading and remains eligible for later auth recovery', async () => {
  const h = await mount({ prepare(state) { state.readProfile = async () => { throw new Error('read unavailable') } } })
  assert.equal(h.current().loading, false)
  assert.equal(h.state.inserts.length, 0)
  h.state.readProfile = async id => ({ data: profileFor(id), error: null })
  await h.emit(sessionFor('owner-a', 'new-token'), 'TOKEN_REFRESHED')
  assert.equal(h.current().profile.auth_user_id, 'owner-a')
})

test('an already dispatched profile insertion cannot replace a later account', async () => {
  const pending = deferred()
  const h = await mount({ prepare(state) {
    state.readProfile = async id => ({ data: id === 'owner-a' ? null : profileFor(id), error: null })
    state.insertProfile = () => pending.promise
  } })
  assert.equal(h.state.inserts.length, 1)
  await h.emit(sessionFor('owner-b'))
  await h.settle(() => pending.resolve({ data: profileFor('owner-a'), error: null }))
  assert.equal(h.current().user.id, 'owner-b')
  assert.equal(h.current().profile.auth_user_id, 'owner-b')
  assert.equal(h.current().loading, false)
})

test('sign-out prevents a stale initial snapshot from restoring the account', async () => {
  const pending = deferred()
  const h = await mount({ prepare(state) { state.initialGate = pending } })
  await h.emit(null, 'SIGNED_OUT')
  await h.settle(() => pending.resolve({ data: { session: sessionFor('owner-a') }, error: null }))
  assert.equal(h.current().user, null)
  assert.equal(h.current().profile, null)
  assert.equal(h.current().session, null)
  assert.equal(h.current().loading, false)
  assert.deepEqual(h.state.reads, [])
})
