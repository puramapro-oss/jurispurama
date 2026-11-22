import assert from 'node:assert/strict'
import { afterEach } from 'node:test'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { createHash } from 'node:crypto'
import { loader, screen } from './mobile-contract-harness.mjs'

// Production modules and Supabase SDK run unchanged. Only native storage,
// navigation/views and HTTP are replaced; there is no live email or auth server.
const require = createRequire(new URL('../package.json', import.meta.url))
const sdkRequire = process.env.JURIS_RECOVERY_TEST_SDK_ROOT
  ? createRequire(resolve(process.env.JURIS_RECOVERY_TEST_SDK_ROOT, 'package.json')) : require
const sdk = sdkRequire('@supabase/supabase-js')
const clients = new Set()
export const tick = () => new Promise(resolve => setImmediate(resolve))
export const deferred = () => {
  let resolve, reject
  const promise = new Promise((ok, fail) => { resolve = ok; reject = fail })
  return { promise, resolve, reject }
}
export const OWNER_A = '11111111-1111-4111-8111-111111111111'
export const OWNER_B = '22222222-2222-4222-8222-222222222222'
export const CODE = '33333333-3333-4333-8333-333333333333'
export const user = id => ({ id, aud: 'authenticated', role: 'authenticated', email: 'fixture@example.invalid',
  app_metadata: {}, user_metadata: {}, created_at: '2026-11-01T00:00:00Z' })
export const token = (id, nonce = 1) => [
  { alg: 'HS256', typ: 'JWT' },
  { sub: id, aud: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600, nonce },
].map(value => Buffer.from(JSON.stringify(value)).toString('base64url')).join('.') + '.' + Buffer.from('fixture-signature').toString('base64url')
export const subject = bearer => JSON.parse(Buffer.from(bearer.split('.')[1], 'base64url').toString()).sub
export const json = (data, status = 200) => Response.json(data, { status })
export const authResponse = () => json({ access_token: token(OWNER_A), refresh_token: 'fixture-refresh-a',
  expires_in: 3600, token_type: 'bearer', user: user(OWNER_A) })

afterEach(async () => {
  for (const client of clients) await client.auth.stopAutoRefresh()
  clients.clear()
})

export async function fixture({ signedIn = false } = {}) {
  const storage = new Map()
  const state = { requests: [], creations: [], challenge: null, badCode: false, get: null, put: null, exchange: null }
  const http = async (input, options = {}) => {
    const url = new URL(input instanceof Request ? input.url : input)
    const headers = new Headers(options.headers)
    const body = options.body ? JSON.parse(options.body) : null
    const entry = { path: url.pathname, method: options.method ?? 'GET', url, body,
      token: headers.get('authorization')?.replace(/^Bearer /, '') }
    state.requests.push(entry)
    if (entry.path === '/auth/v1/recover') {
      state.challenge = body.code_challenge
      return json({})
    }
    if (entry.path === '/auth/v1/token' && url.searchParams.get('grant_type') === 'pkce') {
      if (state.badCode || body.auth_code !== CODE) return json({ code: 'bad_code_verifier', msg: 'Invalid code' }, 400)
      assert.equal(createHash('sha256').update(body.code_verifier).digest('base64url'), state.challenge)
      return state.exchange ? state.exchange(entry) : authResponse()
    }
    if (entry.path === '/auth/v1/user') {
      const id = subject(entry.token)
      if (entry.method === 'PUT') return state.put ? state.put(entry) : json(user(id))
      return state.get ? state.get(entry) : json(user(id))
    }
    throw new Error(`Unexpected offline auth request: ${entry.method} ${entry.path}`)
  }
  const native = loader({
    'react-native-url-polyfill/auto': {},
    'react-native': { Platform: { OS: 'ios' } },
    'expo-secure-store': {
      getItemAsync: async key => storage.get(key) ?? null,
      setItemAsync: async (key, value) => { storage.set(key, value) },
      deleteItemAsync: async key => { storage.delete(key) },
    },
    '@supabase/supabase-js': {
      ...sdk,
      createClient(url, key, options) {
        state.creations.push(options)
        const client = sdk.createClient(url, key, {
          ...options, global: { ...options?.global, fetch: http },
          auth: { ...options?.auth, autoRefreshToken: false },
        })
        clients.add(client)
        return client
      },
    },
  }, { process: { env: { EXPO_PUBLIC_SUPABASE_URL: 'https://auth.fixture.invalid', EXPO_PUBLIC_SUPABASE_ANON_KEY: 'fixture-public-key' } } })
  const supabaseModule = native('mobile/lib/supabase.ts')
  const helper = loader({ '@/lib/supabase': supabaseModule })('mobile/lib/password-recovery.ts')
  let authState
  // The separate React/Zustand suite exercises these store actions with the real
  // renderer. This fixture runs the actual store initializer and event callbacks.
  const auth = loader({
    '@/lib/supabase': supabaseModule, '@/lib/password-recovery': helper,
    zustand: { create(initializer) {
      const set = patch => { authState = { ...authState, ...(typeof patch === 'function' ? patch(authState) : patch) } }
      const get = () => authState
      authState = initializer(set, get)
      const useAuth = select => select(authState)
      useAuth.getState = get
      return useAuth
    } },
  })('mobile/store/auth.ts')
  await auth.useAuth.getState().init()
  async function signIn(id, nonce) {
    const result = await supabaseModule.supabase.auth.setSession({ access_token: token(id, nonce), refresh_token: `fixture-refresh-${id}` })
    assert.equal(result.error, null)
    return result.data.session
  }
  if (signedIn) await signIn(OWNER_A)
  await tick()
  const routes = []
  const router = { replace: path => routes.push(path), back: () => routes.push('back') }
  function mountScreen(path, extra = {}) {
    return screen(path, { dependencies: {
      '@/lib/supabase': supabaseModule, '@/lib/password-recovery': helper,
      '@/store/auth': auth, 'expo-router': { useRouter: () => router }, ...extra,
    } })
  }
  async function ready() {
    const session = await signIn(OWNER_A)
    const attempt = auth.useAuth.getState().beginPasswordRecovery()
    assert.equal(auth.useAuth.getState().finishPasswordRecovery(attempt, session, supabaseModule.supabase), true)
    return helper.recoveryIdentity(session)
  }
  return { state, storage, ...supabaseModule, helper, ...auth, routes, mountScreen, signIn, ready,
    updates: () => state.requests.filter(entry => entry.method === 'PUT') }
}

