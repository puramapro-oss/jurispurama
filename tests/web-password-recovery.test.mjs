import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { act, deferred, mount, sessionFor } from './web-password-recovery.fixture.mjs'

const PASSWORD = 'mot-de-passe-de-test'
async function fillPasswords(fixture, confirmation = PASSWORD) {
  await fixture.fill('new-password', PASSWORD)
  await fixture.fill('confirm-password', confirmation)
}

test('actual reset callback sends the browser PKCE link to the password form', async () => {
  const path = 'src/hooks/useAuth.ts'
  const source = ts.createSourceFile(path, readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true)
  let callback
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === 'resetPassword') callback = node.initializer.arguments[0].getText(source)
    ts.forEachChild(node, visit)
  }
  visit(source); assert.ok(callback)
  const calls = []
  const compiled = ts.transpileModule(`globalThis.reset = ${callback}`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
  const context = { window: { location: { origin: 'https://juris.fixture.invalid' } },
    supabase: { auth: { resetPasswordForEmail: async (...args) => { calls.push(args); return { error: null } } } } }
  vm.runInNewContext(compiled, context)
  await context.reset('fixture@example.invalid')
  assert.equal(calls[0][1].redirectTo, 'https://juris.fixture.invalid/auth/callback?next=/update-password')
})

test('expired link shows a recovery action and never submits a password', async () => {
  const f = await mount({ session: null })
  assert.match(f.container.textContent, /invalide ou a expiré/)
  assert.equal(f.container.querySelector('a').getAttribute('href'), '/forgot-password')
  assert.equal(f.container.querySelector('form'), null)
  assert.equal(f.state.requests.length, 0)
})

test('identity rejected by the server cannot expose the update form', async () => {
  const f = await mount({ prepare: state => { state.userError = true } })
  assert.equal(f.container.querySelector('form'), null)
  assert.match(f.container.textContent, /invalide ou a expiré/)
})

test('actual page completes one update under StrictMode and two same-tick submits', async () => {
  const f = await mount({ strict: true })
  await fillPasswords(f)
  await f.submit(2)
  assert.equal(f.state.requests.length, 1)
  assert.deepEqual(f.state.requests[0], { payload: { password: PASSWORD }, token: 'token-owner-a' })
  assert.match(f.container.textContent, /Ton mot de passe a été modifié/)
  assert.equal(f.container.querySelector('input'), null)
  assert.equal(f.state.listeners.size, 1)
})

test('mismatched confirmation remains an actionable error without a provider call', async () => {
  const f = await mount()
  await fillPasswords(f, 'autre-mot-de-passe')
  await f.submit()
  assert.equal(f.state.requests.length, 0)
  assert.match(f.container.textContent, /doivent être identiques/)
})

test('password below the existing signup minimum is refused before remote work', async () => {
  const f = await mount()
  await f.fill('new-password', 'court')
  await f.fill('confirm-password', 'court')
  await f.submit()
  assert.equal(f.state.requests.length, 0)
  assert.match(f.container.textContent, /au moins 8 caractères/)
})

test('provider failure never produces a success and permits an explicit retry', async () => {
  const f = await mount({ prepare: state => { state.updateError = true } })
  await fillPasswords(f)
  await f.submit()
  assert.doesNotMatch(f.container.textContent, /a été modifié/)
  assert.match(f.container.textContent, /Modification impossible/)
  assert.equal(f.container.querySelector('button').disabled, false)
  f.state.updateError = false
  await f.submit()
  assert.equal(f.state.requests.length, 2)
  assert.match(f.container.textContent, /a été modifié/)
})

test('new account during identity lookup blocks the old form and late result', async () => {
  const gate = deferred()
  const f = await mount({ prepare: state => { state.getUserGate = gate } })
  await f.changeSession(sessionFor('owner-b'))
  await act(async () => gate.resolve())
  await f.settle()
  assert.match(f.container.textContent, /La session a changé/)
  assert.equal(f.container.querySelector('form'), null)
  assert.equal(f.state.requests.length, 0)
})

test('sign-out during update clears the form and ignores late success', async () => {
  const gate = deferred()
  const f = await mount({ prepare: state => { state.updateGate = gate } })
  await fillPasswords(f)
  await f.submit()
  assert.equal(f.state.requests.length, 1)
  await f.changeSession(null, 'SIGNED_OUT')
  await act(async () => gate.resolve())
  await f.settle()
  assert.doesNotMatch(f.container.textContent, /a été modifié/)
  assert.equal(f.container.querySelector('form'), null)
})

test('account change cannot redirect an in-flight password update to another identity', async () => {
  const gate = deferred()
  const f = await mount({ prepare: state => { state.updateGate = gate } })
  await fillPasswords(f)
  await f.submit()
  await f.changeSession(sessionFor('owner-b'))
  await act(async () => gate.resolve())
  await f.settle()
  assert.equal(f.state.requests.length, 1)
  assert.equal(f.state.requests[0].token, 'token-owner-a')
  assert.match(f.container.textContent, /La session a changé/)
  assert.doesNotMatch(f.container.textContent, /a été modifié/)
})

test('late initial session cannot override a more recent auth event', async () => {
  const initial = deferred()
  const f = await mount({ prepare: state => { state.initialGate = initial } })
  await f.changeSession(sessionFor('owner-b'))
  await act(async () => initial.resolve({ data: { session: sessionFor('owner-a') }, error: null }))
  await f.settle()
  await fillPasswords(f)
  await f.submit()
  assert.equal(f.state.requests[0].token, 'token-owner-b')
})

test('refresh of the same account revalidates the token and preserves the draft', async () => {
  const f = await mount()
  await fillPasswords(f)
  await f.changeSession(sessionFor('owner-a', 'token-owner-a-refreshed'), 'TOKEN_REFRESHED')
  assert.equal(f.container.querySelector('#new-password').value, PASSWORD)
  await f.submit()
  assert.equal(f.state.requests[0].token, 'token-owner-a-refreshed')
  assert.match(f.container.textContent, /a été modifié/)
})

test('old update completion after token refresh cannot unlock or confirm a newer request', async () => {
  const old = deferred(), current = deferred()
  const f = await mount({ prepare: state => { state.updateGate = old } })
  await fillPasswords(f)
  await f.submit()
  await f.changeSession(sessionFor('owner-a', 'token-owner-a-refreshed'), 'TOKEN_REFRESHED')
  f.state.updateGate = current
  await f.submit()
  assert.equal(f.state.requests.length, 2)
  await act(async () => old.resolve())
  await f.settle()
  assert.equal(f.container.querySelector('button').disabled, true)
  assert.doesNotMatch(f.container.textContent, /a été modifié/)
  await act(async () => current.resolve())
  await f.settle()
  assert.match(f.container.textContent, /a été modifié/)
})

test('unmount removes subscription and prevents late confirmation', async () => {
  const gate = deferred()
  const f = await mount({ prepare: state => { state.updateGate = gate } })
  await fillPasswords(f)
  await f.submit()
  await f.unmount()
  await act(async () => gate.resolve())
  await f.settle()
  assert.equal(f.state.listeners.size, 0)
  assert.equal(f.container.textContent, '')
})

test('forgot-password ignores repeated submits and handles a network rejection', async () => {
  const gate = deferred()
  const f = await mount({ forgot: true, prepare: state => { state.resetGate = gate } })
  await f.fill('email', 'fixture@example.invalid')
  await f.submit(2)
  assert.equal(f.state.resetRequests.length, 1)
  await act(async () => gate.reject(new Error('network unavailable')))
  await f.settle()
  assert.equal(f.state.errors.length, 1)
  assert.equal(f.state.successes.length, 0)
  assert.equal(f.container.querySelector('button').disabled, false)
})

test('forgot-password ignores a late response after leaving the page', async () => {
  const gate = deferred()
  const f = await mount({ forgot: true, prepare: state => { state.resetGate = gate } })
  await f.fill('email', 'fixture@example.invalid')
  await f.submit()
  await f.unmount()
  await act(async () => gate.resolve())
  await f.settle()
  assert.equal(f.state.errors.length + f.state.successes.length, 0)
})
