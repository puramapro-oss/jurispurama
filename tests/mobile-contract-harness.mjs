import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import vm from 'node:vm'

const root = resolve(new URL('../', import.meta.url).pathname)
const require = createRequire(process.env.JURIS_TEST_DEPENDENCY_ROOT
  ? resolve(process.env.JURIS_TEST_DEPENDENCY_ROOT, 'package.json')
  : new URL('../package.json', import.meta.url))
const { transformSync } = require('esbuild')
const { z } = require('zod')
const jsx = require('react/jsx-runtime')

export function loader(dependencies, globals = {}) {
  const cache = new Map()
  return function load(file) {
    const path = resolve(root, file)
    if (cache.has(path)) return cache.get(path).exports
    const loadedModule = { exports: {} }
    cache.set(path, loadedModule)
    const code = transformSync(readFileSync(path, 'utf8'), {
      loader: path.endsWith('tsx') ? 'tsx' : 'ts', format: 'cjs', jsx: 'automatic',
    }).code
    const localRequire = name => {
      if (Object.hasOwn(dependencies, name)) return dependencies[name]
      if (name.startsWith('.')) return load(resolve(dirname(path), name + '.ts'))
      throw new Error(`Unexpected dependency ${name} in ${file}`)
    }
    vm.runInNewContext(code, { module: loadedModule, exports: loadedModule.exports, require: localRequire,
      Date, URL, Headers, Request, Response, console, ...globals }, { filename: path })
    return loadedModule.exports
  }
}

export const fixtureCase = {
  id: 'case-fixture', user_id: 'profile-fixture', type: 'travail',
  summary: 'Salaire non payé', status: 'en_attente',
  created_at: '2026-11-01T12:00:00Z', updated_at: '2026-11-20T12:00:00Z',
}

export class ApiError extends Error {
  constructor(message, status) { super(message); this.status = status }
}

export function screen(file, { api = async () => ({}), openURL, userId = 'user-fixture', dependencies = {} } = {}) {
  const state = { userId, requests: [], opened: [], alerts: [], slots: [], index: 0, effects: [] }
  const changed = (before, after) => !before || !after || before.length !== after.length || before.some((value, i) => !Object.is(value, after[i]))
  const React = {
    useState(initial) {
      const i = state.index++
      if (!(i in state.slots)) state.slots[i] = initial
      return [state.slots[i], next => { state.slots[i] = typeof next === 'function' ? next(state.slots[i]) : next }]
    },
    useRef(initial) {
      const i = state.index++
      if (!(i in state.slots)) state.slots[i] = { current: initial }
      return state.slots[i]
    },
    useEffect(effect, dependencies) {
      const i = state.index++
      const previous = state.slots[i]
      if (changed(previous?.dependencies, dependencies)) {
        state.effects.push(() => { previous?.cleanup?.(); state.slots[i].cleanup = effect() })
        state.slots[i] = { dependencies, cleanup: previous?.cleanup }
      }
    },
    useCallback(callback, dependencies) {
      const i = state.index++
      if (changed(state.slots[i]?.dependencies, dependencies)) state.slots[i] = { dependencies, callback }
      return state.slots[i].callback
    },
  }
  const useAuth = select => select(useAuth.getState())
  useAuth.getState = () => ({ user: state.userId ? { id: state.userId } : null })
  const load = loader({
    react: React, 'react/jsx-runtime': jsx,
    'react-native': {
      Platform: { OS: 'ios' },
      ...Object.fromEntries(['Text', 'View', 'FlatList', 'RefreshControl', 'ActivityIndicator'].map(name => [name, name])),
      Linking: { async openURL(url) { state.opened.push(url); return openURL?.(url) } },
      Alert: { alert: (...args) => state.alerts.push(args) },
    },
    '@/components/Screen': { Screen: 'Screen' }, '@/components/Card': { Card: 'Card' },
    '@/components/Button': { Button: 'Button' },
    '@/components/Input': { Input: 'Input' },
    '@/lib/api': { API_BASE: 'https://juris.fixture.invalid', ApiError,
      api: async (path, init = {}) => { state.requests.push({ path, ...init }); return api(path, init) } },
    '@/store/auth': { useAuth },
    'expo-modules-core': { uuid: { v4: randomUUID } },
    'expo-router': { useRouter: () => ({ push() {} }) },
    'lucide-react-native': Object.fromEntries(['Check', 'Sparkles', 'FolderOpen', 'Plus'].map(name => [name, name])),
    ...dependencies,
  }, { AbortController })
  const component = load(file).default
  function render() { state.index = 0; return component() }
  async function flushEffects() {
    for (const effect of state.effects.splice(0)) effect()
    await new Promise(resolve => setImmediate(resolve))
  }
  return { state, render, flushEffects, unmount() {
    for (const slot of state.slots) slot?.cleanup?.()
  }, async mount() {
    render()
    await flushEffects()
    return render()
  } }
}

export function nodes(element) {
  if (!element) return []
  if (Array.isArray(element)) return element.flatMap(nodes)
  if (typeof element !== 'object') return []
  return [element, ...nodes(element.props?.children)]
}
export function renderedText(element) {
  if (element == null || typeof element === 'boolean') return ''
  if (Array.isArray(element)) return element.map(renderedText).join(' ')
  if (typeof element !== 'object') return String(element)
  return renderedText(element.props?.children)
}
export function button(tree, id) {
  const found = nodes(tree).find(node => node.props?.testID === id)
  assert.ok(found, `Button ${id} exists`)
  return found
}

export function route(file, { hasCookie = false, rejectToken = false, authErrorWithUser = false } = {}) {
  const calls = { userTokens: [], queries: [], stripe: [], limits: 0 }
  const profile = { id: 'profile-fixture', auth_user_id: 'user-fixture', email: 'fixture@example.invalid',
    full_name: 'Fixture', stripe_customer_id: 'cus_fixture', stripe_subscription_id: null, subscription_plan: 'free' }
  const client = (bearer = false) => ({
    auth: { async getUser(token) {
      calls.userTokens.push(token)
      const authorized = (bearer && !rejectToken && token === 'fixture.token') || (!bearer && hasCookie)
      return { data: { user: authorized ? { id: 'user-fixture' } : null },
        error: authErrorWithUser || rejectToken ? new Error('Token rejected') : null }
    } },
    from(table) {
      const entry = { table, filters: [], insert: null }
      calls.queries.push(entry)
      const query = {
        select() { return query }, eq(...args) { entry.filters.push(args); return query },
        order() { return query }, ilike() { return query },
        insert(value) { entry.insert = value; return query }, update() { return query },
        async maybeSingle() { return { data: table === 'jurispurama_users' ? profile : { ...fixtureCase, ...entry.insert }, error: null } },
        then(ok, fail) { return Promise.resolve({ data: [fixtureCase], error: null }).then(ok, fail) },
      }
      return query
    },
  })
  const stripe = {
    customers: { create: async () => { throw new Error('Unexpected customer creation') } },
    checkout: { sessions: { async create(payload, options) {
      calls.stripe.push({ operation: 'checkout', payload, options }); return { url: 'https://checkout.stripe.com/c/pay/fixture' }
    } } },
    billingPortal: { sessions: { async create(payload) {
      calls.stripe.push({ operation: 'portal', payload }); return { url: 'https://billing.stripe.com/p/session/fixture' }
    } } },
  }
  const load = loader({
    'next/server': { NextResponse: { json: (body, init) => Response.json(body, init) } }, zod: { z },
    '@/lib/supabase-server': {
      createServerSupabaseClient: async () => client(false),
      createRequestSupabaseClient: async request => {
        const authorization = request.headers.get('authorization')
        if (authorization === null) return { client: client(false), accessToken: undefined }
        if (authorization !== 'Bearer fixture.token') return null
        return { client: client(true), accessToken: 'fixture.token' }
      },
    },
    '@/lib/supabase': { createServiceClient: () => { throw new Error('Unexpected service client') } },
    '@/lib/rate-limit': { rateLimit: async () => { calls.limits++; return { allowed: true } } },
    '@/lib/constants': { APP_DOMAIN: 'juris.fixture.invalid' },
    '@/lib/cross-promo': { PROMO_COOKIE_NAME: 'fixture_promo' },
    '@/lib/stripe': { getStripe: () => stripe, resolvePriceId: (plan, billing) => `price_${plan}_${billing}`,
      getOrCreateWelcomeCoupon: async () => { throw new Error('Unexpected coupon') },
      getOrCreateCrossPromoCoupon: async () => { throw new Error('Unexpected coupon') } },
  })
  return { handler: load(file), calls }
}

export function request(path, { method = 'GET', body, authorization } = {}) {
  const headers = new Headers({ 'content-type': 'application/json' })
  if (authorization !== undefined) headers.set('authorization', authorization)
  const req = new Request(`https://juris.fixture.invalid${path}`, {
    method, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
  req.nextUrl = new URL(req.url)
  req.cookies = { get: () => undefined }
  return req
}
