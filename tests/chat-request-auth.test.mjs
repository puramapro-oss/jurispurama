import { afterEach, beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { registerHooks, createRequire } from 'node:module'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = new URL('../', import.meta.url)
const dependencyRequire = createRequire(process.env.JURIS_TEST_DEPENDENCY_ROOT
  ? pathToFileURL(resolve(process.env.JURIS_TEST_DEPENDENCY_ROOT, 'package.json'))
  : new URL('../package.json', import.meta.url))
const sdkUrl = pathToFileURL(dependencyRequire.resolve('@supabase/supabase-js')).href
const zodUrl = pathToFileURL(dependencyRequire.resolve('zod')).href
const sources = {
  'next/server': 'export const NextResponse = { json: (body, init) => Response.json(body, init) }',
  'next/headers': `export async function cookies() {
    globalThis.__jurisRequestAuth.cookieReads++;
    return { getAll: () => [], set: () => {} };
  }`,
  '@supabase/ssr': `export function createServerClient(url, key, options) {
    const state = globalThis.__jurisRequestAuth;
    state.cookieOptions.push({ url, key, options });
    return state.cookieClient;
  }`,
  '@supabase/supabase-js': `import { createClient as realCreateClient } from ${JSON.stringify(sdkUrl)};
    export function createClient(url, key, options) {
      globalThis.__jurisRequestAuth.sdkOptions.push({ url, key, options });
      return realCreateClient(url, key, options);
    }`,
  '@/lib/supabase': 'export const createServiceClient = () => { throw new Error("Unexpected service client in admission test") }',
  '@/lib/claude': `export async function* streamClaude() {
    globalThis.__jurisRequestAuth.providerCalls++;
    throw new Error('Unexpected provider call in admission test');
  }`,
}
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier in sources) return { url: `juris-auth-test:${specifier}`, shortCircuit: true }
    if (specifier === 'zod') return { url: zodUrl, shortCircuit: true }
    if (specifier.startsWith('@/')) return { url: new URL(`src/${specifier.slice(2)}.ts`, root).href, shortCircuit: true }
    if (specifier.startsWith('.') && context.parentURL?.startsWith(root.href)) {
      const target = new URL(`${specifier}.ts`, context.parentURL)
      if (existsSync(fileURLToPath(target))) return { url: target.href, shortCircuit: true }
    }
    return nextResolve(specifier, context)
  },
  load(url, context, nextLoad) {
    if (url.startsWith('juris-auth-test:')) return { format: 'module', source: sources[url.slice(16)], shortCircuit: true }
    return nextLoad(url, context)
  },
})
const { createRequestSupabaseClient } = await import('../src/lib/supabase-server.ts')
const { POST } = await import('../src/app/api/ai/chat/route.ts')
const originalFetch = globalThis.fetch
const oldEnvironment = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
}
let state
beforeEach(() => {
  state = {
    cookieReads: 0, cookieOptions: [], sdkOptions: [], requests: [], providerCalls: 0,
    tokenAccepted: true,
    cookieClient: { auth: { getUser: async () => ({ data: { user: { id: 'cookie-user' } }, error: null }) } },
  }
  globalThis.__jurisRequestAuth = state
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://fixture.supabase.invalid'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anonymous-fixture-key'
  globalThis.fetch = async (input, init = {}) => {
    const url = new URL(typeof input === 'string' ? input : input.url)
    const headers = new Headers(init.headers)
    state.requests.push({ path: url.pathname, search: url.search, headers })
    assert.equal(url.hostname, 'fixture.supabase.invalid', 'all network requests stay inside the mock')
    if (url.pathname === '/auth/v1/user') return state.tokenAccepted
      ? Response.json({ id: 'bearer-user', aud: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' })
      : Response.json({ message: 'invalid token', code: 'bad_jwt' }, { status: 401 })
    if (url.pathname === '/rest/v1/jurispurama_users') return Response.json([])
    throw new Error(`Unexpected mock request: ${url.pathname}`)
  }
})
afterEach(() => {
  globalThis.fetch = originalFetch
  delete globalThis.__jurisRequestAuth
  for (const [key, value] of Object.entries(oldEnvironment)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
})
function request(authorization) {
  return new Request('https://app.example.invalid/api/ai/chat', {
    method: 'POST', headers: authorization === undefined ? {} : { Authorization: authorization },
    body: JSON.stringify({ message: 'Question de test' }),
  })
}

test('absent Authorization preserves the browser cookie client and application schema', async () => {
  const result = await createRequestSupabaseClient(request())
  assert.equal(result.client, state.cookieClient)
  assert.equal(result.accessToken, undefined)
  assert.equal(state.cookieReads, 1)
  assert.equal(state.cookieOptions[0].options.db.schema, 'jurispurama')
  assert.deepEqual(state.sdkOptions, [])
  assert.deepEqual(state.requests, [])
})

for (const invalid of ['', 'Basic fixture', 'Bearer', 'Bearer token with spaces', 'Bearer first,Bearer second', 'Bearer\tfixture']) {
  test(`invalid explicit authorization ${JSON.stringify(invalid)} cannot use a valid browser session`, async () => {
    const response = await POST(request(invalid))
    assert.equal(response.status, 401)
    assert.equal(state.cookieReads, 0)
    assert.deepEqual(state.sdkOptions, [])
    assert.deepEqual(state.requests, [])
    assert.equal(state.providerCalls, 0)
  })
}

for (const scheme of ['Bearer', 'bEaReR']) {
  test(`${scheme} verifies its token with the actual SDK and scopes the database client to that identity`, async () => {
    const response = await POST(request(`${scheme} user.token.signature`))
    assert.equal(response.status, 404, 'the accepted identity proceeds to the deliberately absent profile')
    assert.equal(state.cookieReads, 0)
    assert.equal(state.sdkOptions.length, 1)
    const { key, options } = state.sdkOptions[0]
    assert.equal(key, 'anonymous-fixture-key')
    assert.deepEqual(options.auth, { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false })
    assert.equal(options.db.schema, 'jurispurama')
    assert.equal(state.requests.length, 2)
    assert.equal(state.requests[0].path, '/auth/v1/user')
    assert.equal(state.requests[1].path, '/rest/v1/jurispurama_users')
    for (const sent of state.requests) {
      assert.equal(sent.headers.get('authorization'), 'Bearer user.token.signature')
      assert.equal(sent.headers.get('apikey'), 'anonymous-fixture-key')
    }
    assert.equal(state.requests[1].headers.get('accept-profile'), 'jurispurama')
    assert.match(state.requests[1].search, /auth_user_id=eq.bearer-user/)
    assert.equal(state.providerCalls, 0)
  })
}

test('invalid token from the actual SDK stops before tables or model, without cookie fallback', async () => {
  state.tokenAccepted = false
  const response = await POST(request('Bearer bad.token.signature'))
  assert.equal(response.status, 401)
  assert.equal(state.cookieReads, 0)
  assert.equal(state.requests.length, 1)
  assert.equal(state.requests[0].path, '/auth/v1/user')
  assert.equal(state.providerCalls, 0)
})
