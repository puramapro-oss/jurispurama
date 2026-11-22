import assert from 'node:assert/strict'
import { beforeEach, test } from 'node:test'
import { registerHooks } from 'node:module'

const root = new URL('../', import.meta.url)
const modules = {
  'next/server': 'export const NextResponse = { redirect: value => Response.redirect(value, 307) }',
  '@/lib/supabase-server': `export const createServerSupabaseClient = async () => {
    globalThis.__jurisCallbackState.clients++;
    return {auth:{exchangeCodeForSession: async code => {
      globalThis.__jurisCallbackState.codes.push(code);
      return {error:globalThis.__jurisCallbackState.error};
    }}};
  }`,
}
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier in modules) return { url: `juris-callback-test:${specifier}`, shortCircuit: true }
    if (specifier.startsWith('@/')) return { url: new URL(`src/${specifier.slice(2)}.ts`, root).href, shortCircuit: true }
    return nextResolve(specifier, context)
  },
  load(url, context, nextLoad) {
    if (url.startsWith('juris-callback-test:')) return { format: 'module', source: modules[url.slice(20)], shortCircuit: true }
    return nextLoad(url, context)
  },
})
const { GET } = await import('../src/app/auth/callback/route.ts')
let state
beforeEach(() => { state = globalThis.__jurisCallbackState = { clients: 0, codes: [], error: null } })
const origin = 'https://juris-fixture.invalid'
function request(next, { code = 'fixture-pkce-code' } = {}) {
  const url = new URL('/auth/callback', origin)
  if (next !== null) url.searchParams.set('next', next)
  if (code) url.searchParams.set('code', code)
  return new Request(url)
}

for (const [next, expected] of [
  [null, '/dashboard'], ['/dashboard', '/dashboard'], ['/update-password', '/update-password'],
  ['/cases/../dashboard?tab=active#latest', '/dashboard?tab=active#latest'],
  ['/chat/11111111-1111-4111-8111-111111111111?draft=a%20b', '/chat/11111111-1111-4111-8111-111111111111?draft=a%20b'],
  ['/recherche?q=https%3A%2F%2Fexample.invalid%2Ffoo#résumé', '/recherche?q=https%3A%2F%2Fexample.invalid%2Ffoo#r%C3%A9sum%C3%A9'],
  ['/dossiers/caf%C3%A9?tri=r%C3%A9cent', '/dossiers/caf%C3%A9?tri=r%C3%A9cent'],
]) {
  test(`PKCE callback preserves the internal normalized destination ${JSON.stringify(next)}`, async () => {
    const response = await GET(request(next))
    assert.equal(response.status, 307)
    assert.equal(response.headers.get('location'), `${origin}${expected}`)
    assert.equal(state.clients, 1)
    assert.deepEqual(state.codes, ['fixture-pkce-code'])
  })
}

for (const next of [
  '', 'dashboard', '?next=//example.invalid', '#fragment',
  'https://example.invalid/phishing', 'http://example.invalid', 'https://juris-fixture.invalid/dashboard',
  '//example.invalid/path', '///example.invalid', '//juris-fixture.invalid@evil.invalid',
  '/\\example.invalid', '\\example.invalid', '/safe\\..\\\\example.invalid',
  'javascript:alert(1)', 'data:text/html,example', '\n//example.invalid', '/\t/example.invalid', '/safe\u0000',
  '/%2fexample.invalid', '/%2F%2Fexample.invalid', '/%5cexample.invalid', '/%255cexample.invalid',
  '/%252fexample.invalid', '/%25252fexample.invalid', '/%09/example.invalid', '/%0d%0aLocation:evil',
  '/a/..//example.invalid', '/a/%2e%2e//example.invalid', '/a/%252e%252e/%252fexample.invalid',
  '/%E0%A4%A', '/%zz',
]) {
  test(`PKCE callback refuses the unsafe destination ${JSON.stringify(next)}`, async () => {
    const response = await GET(request(next))
    assert.equal(response.headers.get('location'), `${origin}/dashboard`)
    assert.deepEqual(state.codes, ['fixture-pkce-code'])
  })
}

test('a failed PKCE exchange retains the login failure path regardless of next', async () => {
  state.error = { message: 'private-auth-detail' }
  const response = await GET(request('/update-password'))
  assert.equal(response.headers.get('location'), `${origin}/login?error=auth_failed`)
  assert.deepEqual(state.codes, ['fixture-pkce-code'])
})

test('a callback without a code does not create an authenticated client', async () => {
  const response = await GET(request('/update-password', { code: null }))
  assert.equal(response.headers.get('location'), `${origin}/login?error=auth_failed`)
  assert.equal(state.clients, 0)
  assert.deepEqual(state.codes, [])
})
