import { before, after, afterEach } from 'node:test'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRequire = createRequire(new URL('../package.json', import.meta.url))
const dependencyRequire = process.env.JURIS_REACT_TEST_DEPENDENCY_ROOT
  ? createRequire(resolve(process.env.JURIS_REACT_TEST_DEPENDENCY_ROOT, 'package.json')) : projectRequire
const { JSDOM } = process.env.JURIS_REACT_TEST_JSDOM_PATH
  ? projectRequire(process.env.JURIS_REACT_TEST_JSDOM_PATH) : dependencyRequire('jsdom')
const React = projectRequire('react'), ts = projectRequire('typescript')
export const { act } = React
export const deferred = () => Promise.withResolvers()
// The canonical hook defers profile work with a real timer to release the SDK lock.
export const tick = () => new Promise(resolveTick => setTimeout(resolveTick, 0))
export const sessionFor = (id = 'owner-a', token = `token-${id}`) => ({
  user: { id, email: `${id}@example.invalid`, user_metadata: { full_name: id } },
  access_token: token, refresh_token: `refresh-${id}`,
})
export const profileFor = id => ({ id: `profile-${id}`, auth_user_id: id, full_name: id, role: 'user', subscription_plan: 'free' })
const root = fileURLToPath(new URL('../', import.meta.url)), originals = new Map(), mounted = new Set()
let dom, createRoot

before(() => {
  dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://juris.fixture.invalid/' })
  for (const [key, value] of Object.entries({ window: dom.window, document: dom.window.document,
    navigator: dom.window.navigator, IS_REACT_ACT_ENVIRONMENT: true })) {
    originals.set(key, Object.getOwnPropertyDescriptor(globalThis, key))
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
  }
  createRoot = projectRequire('react-dom/client').createRoot
})
afterEach(async () => { for (const f of [...mounted]) await f.unmount() })
after(() => {
  dom.window.close()
  for (const [key, descriptor] of originals) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor)
    else delete globalThis[key]
  }
})

export async function mount({ session = sessionFor(), strict = false, prepare } = {}) {
  const state = { session, listeners: new Set(), subscriptions: 0, unsubscriptions: 0,
    clientCreations: 0, reads: [], inserts: [], inAuthCallback: false, queriesInsideCallback: 0,
    callbackResults: [], resets: [], rendered: [], initialGate: null, snapshotError: null }
  state.readProfile = async id => ({ data: profileFor(id), error: null })
  state.insertProfile = async payload => ({ data: { ...profileFor(payload.auth_user_id), ...payload }, error: null })
  prepare?.(state)
  const client = { auth: {
    async getSession() {
      if (state.initialGate) { const gate = state.initialGate; state.initialGate = null; return gate.promise }
      if (state.snapshotError) throw state.snapshotError
      return { data: { session: state.session }, error: null }
    },
    onAuthStateChange(listener) {
      state.subscriptions++; state.listeners.add(listener)
      return { data: { subscription: { unsubscribe() { state.unsubscriptions++; state.listeners.delete(listener) } } } }
    },
    resetPasswordForEmail: async (email, options) => { state.resets.push({ email, options }); return { error: null } },
  },
  from(table) {
    if (state.inAuthCallback) state.queriesInsideCallback++
    if (table !== 'jurispurama_users') throw new Error(`Unexpected table ${table}`)
    let ownerId, payload
    const query = {
      select() { return query },
      eq(key, value) { if (key !== 'auth_user_id') throw new Error(`Unexpected filter ${key}`); ownerId = value; return query },
      insert(value) { payload = value; return query },
      maybeSingle() {
        return Promise.resolve().then(() => {
          if (payload) { state.inserts.push(payload); return state.insertProfile(payload) }
          state.reads.push(ownerId); return state.readProfile(ownerId)
        })
      },
    }
    return query
  } }
  const cache = new Map()
  function load(file) {
    const filePath = resolve(root, file)
    if (cache.has(filePath)) return cache.get(filePath).exports
    const loadedModule = { exports: {} }; cache.set(filePath, loadedModule)
    const source = ts.transpileModule(readFileSync(filePath, 'utf8'), { compilerOptions: {
      target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
    } }).outputText
    const localRequire = name => {
      if (name === 'react') return React
      if (name === '@/lib/supabase') return { createClient: () => { state.clientCreations++; return client } }
      if (name.startsWith('@/')) return load(`src/${name.slice(2)}.ts`)
      if (name.startsWith('.')) return load(resolve(dirname(filePath), `${name}.ts`))
      return projectRequire(name)
    }
    new Function('require', 'module', 'exports', source)(localRequire, loadedModule, loadedModule.exports)
    return loadedModule.exports
  }
  const { useAuth } = load('src/hooks/useAuth.ts')
  let latest
  function HookView() {
    latest = useAuth()
    const snapshot = { userId: latest.user?.id ?? null, profileOwner: latest.profile?.auth_user_id ?? null,
      token: latest.session?.access_token ?? null, loading: latest.loading }
    state.rendered.push(snapshot)
    return React.createElement('pre', null, JSON.stringify(snapshot))
  }
  const container = document.createElement('div'); document.body.appendChild(container)
  const reactRoot = createRoot(container)
  const fixture = {
    state, container, current: () => latest,
    async settle(fn = () => undefined) { await act(async () => { await fn(); await tick(); await tick() }) },
    async emit(next, event = 'SIGNED_IN') {
      await act(async () => {
        state.session = next
        for (const listener of [...state.listeners]) {
          state.inAuthCallback = true
          try {
            const value = listener(event, next)
            state.callbackResults.push(value)
            value?.catch?.(() => undefined)
          } finally { state.inAuthCallback = false }
        }
        await tick()
      })
    },
    async unmount() {
      if (!mounted.delete(fixture)) return
      await act(async () => reactRoot.unmount())
      container.remove()
    },
  }
  mounted.add(fixture)
  await act(async () => {
    reactRoot.render(strict ? React.createElement(React.StrictMode, null, React.createElement(HookView)) : React.createElement(HookView))
    await tick()
  })
  await fixture.settle()
  return fixture
}
