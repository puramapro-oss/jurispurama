import assert from 'node:assert/strict'
import { before, after, afterEach } from 'node:test'
import { createRequire } from 'node:module'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const testDir = fileURLToPath(new URL('.', import.meta.url))

// The production screen, Zustand auth store, request transport and SSE reader run.
// Only the native view primitives, Supabase boundary and Expo fetch are doubled.
// Explicit dependency paths allow offline verification without changing the app lockfile.
const projectRequire = createRequire(path.resolve(testDir, '../package.json'))
const testDependencyRequire = process.env.JURIS_REACT_TEST_DEPENDENCY_ROOT
  ? createRequire(path.resolve(process.env.JURIS_REACT_TEST_DEPENDENCY_ROOT, 'package.json'))
  : projectRequire
const jsdomRequire = process.env.JURIS_REACT_TEST_JSDOM_PATH
  ? createRequire(path.join(process.env.JURIS_REACT_TEST_JSDOM_PATH, 'package.json'))
  : testDependencyRequire
const { JSDOM } = jsdomRequire('jsdom')
const React = testDependencyRequire('react')
const ts = projectRequire('typescript')
const { act } = React
const zustandRoot = process.env.JURIS_REACT_TEST_ZUSTAND_PATH
  ?? path.dirname(testDependencyRequire.resolve('zustand/package.json'))
const vanilla = projectRequire(path.join(zustandRoot, 'vanilla.js'))
// Keep the real Zustand implementation and one React instance across the fixture.
const zustandModule = { exports: {} }
new Function('require', 'module', 'exports', readFileSync(path.join(zustandRoot, 'react.js'), 'utf8'))(
  name => name === 'react' ? React : name === 'zustand/vanilla' ? vanilla : projectRequire(name),
  zustandModule, zustandModule.exports,
)

let dom, createRoot
const activeFixtures = new Set()
const originals = new Map()
const CASE_A = '11111111-1111-4111-8111-111111111111'
const CASE_B = '22222222-2222-4222-8222-222222222222'
const tick = () => new Promise(resolve => setImmediate(resolve))
const deferred = () => {
  let resolve, reject
  const promise = new Promise((ok, fail) => { resolve = ok; reject = fail })
  return { promise, resolve, reject }
}

before(() => {
  dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://fixture.example.invalid/' })
  for (const [key, value] of Object.entries({
    window: dom.window, document: dom.window.document, navigator: dom.window.navigator,
    HTMLElement: dom.window.HTMLElement, IS_REACT_ACT_ENVIRONMENT: true,
  })) {
    originals.set(key, Object.getOwnPropertyDescriptor(globalThis, key))
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
  }
  createRoot = testDependencyRequire('react-dom/client').createRoot
})
afterEach(async () => {
  for (const fixture of [...activeFixtures]) await fixture.unmount()
})
after(() => {
  dom.window.close()
  for (const [key, descriptor] of originals) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor)
    else delete globalThis[key]
  }
})

function nativePrimitives(state) {
  const box = tag => function NativePrimitive({ children, testID, accessibilityRole, accessibilityLabel }) {
    return React.createElement(tag, {
      'data-testid': testID, role: accessibilityRole, 'aria-label': accessibilityLabel,
    }, children)
  }
  return {
    View: box('div'), ScrollView: box('div'), KeyboardAvoidingView: box('div'), Text: box('span'), Platform: { OS: 'ios' },
    Alert: { alert: (...args) => state.alerts.push(args) },
    TextInput: ({ value, onChangeText, testID, accessibilityLabel, maxLength }) => React.createElement('textarea', {
      value, onInput: event => onChangeText(event.currentTarget.value), 'data-testid': testID,
      'aria-label': accessibilityLabel, maxLength,
    }),
    Pressable: ({ children, onPress, disabled, testID, accessibilityLabel }) => React.createElement('button', {
      onClick: onPress, disabled, 'data-testid': testID, 'aria-label': accessibilityLabel,
    }, children),
    ActivityIndicator: () => React.createElement('span', { 'data-testid': 'spinner' }),
    FlatList: React.forwardRef(function FlatList({ data, keyExtractor, renderItem }, ref) {
      React.useImperativeHandle(ref, () => ({ scrollToEnd() {} }), [])
      return React.createElement('div', { 'data-testid': 'message-list' }, data.map(item =>
        React.createElement('div', { key: keyExtractor(item), 'data-message-id': item.id }, renderItem({ item }))))
    }),
  }
}

async function mount({ strict = false, owner = 'owner-a', prepareAuth,
  screen = 'mobile/app/(tabs)/chat.tsx', segments = ['(tabs)', 'chat'], linkedURL = null } = {}) {
  const session = id => id ? { access_token: `fixture-token-${id}`, user: { id } } : null
  const state = { currentSession: session(owner), requests: [], authListeners: new Set(), timers: new Map(), nextTimer: 1,
    routes: [], alerts: [], segments, linkedURL, exchanges: [], recoveryClients: [], updates: [] }
  state.getSession = () => Promise.resolve({ data: { session: state.currentSession }, error: null })
  state.fetch = () => Promise.resolve(sseResponse([{ type: 'case_created', caseId: CASE_A }, { type: 'text', content: 'Réponse A' }, { type: 'done', caseId: CASE_A }]))
  const supabase = { auth: {
    getSession: () => state.getSession(),
    onAuthStateChange(callback) {
      state.authListeners.add(callback)
      return { data: { subscription: { unsubscribe() { state.authListeners.delete(callback) } } } }
    },
    async signOut() {
      state.currentSession = null
      for (const listener of state.authListeners) listener('SIGNED_OUT', null)
      return { error: null }
    },
    async getUser(token) {
      return { data: { user: token === state.currentSession?.access_token ? state.currentSession.user : null }, error: null }
    },
    async exchangeCodeForSession(code) {
      state.exchanges.push(code)
      const response = await state.exchange(code)
      if (response.data?.session) {
        state.currentSession = response.data.session
        for (const listener of state.authListeners) listener('SIGNED_IN', state.currentSession)
      }
      return response
    },
  } }
  function createIsolatedClient(isRecovery) {
    let isolatedSession = null
    const client = { auth: {
      async getSession() { return { data: { session: isolatedSession }, error: null } },
      async getUser(token) {
        return { data: { user: token === isolatedSession?.access_token ? isolatedSession.user : null }, error: null }
      },
      async exchangeCodeForSession(code) {
        state.exchanges.push(code)
        const response = await state.exchange(code)
        if (response.data?.session) isolatedSession = response.data.session
        return response
      },
      async setSession(tokens) {
        for (const recovery of state.recoveryClients) {
          const { data } = await recovery.auth.getSession()
          if (data.session?.access_token === tokens.access_token) isolatedSession = data.session
        }
        return { data: { session: isolatedSession, user: isolatedSession?.user ?? null }, error: null }
      },
      async updateUser(value) {
        state.updates.push({ ...value, userId: isolatedSession?.user.id })
        return state.update ? state.update(value) : { data: { user: isolatedSession?.user ?? null }, error: null }
      },
    } }
    if (isRecovery) state.recoveryClients.push(client)
    return client
  }
  const supabaseBoundary = { supabase,
    createPasswordRecoveryClient: () => createIsolatedClient(true),
    createPasswordUpdateClient: () => createIsolatedClient(false),
  }
  const cache = new Map(), native = nativePrimitives(state)
  const router = { replace: route => state.routes.push(route), back: () => state.routes.push('back') }
  const Stack = ({ children }) => React.createElement(native.View, null, children)
  Stack.Screen = function StackScreen() { return null }
  const modules = {
    react: React, 'react/jsx-runtime': testDependencyRequire('react/jsx-runtime'), zustand: zustandModule.exports,
    'react-native': native, 'react-native-safe-area-context': { SafeAreaView: native.View, SafeAreaProvider: native.View },
    '@/global.css': {}, 'expo-status-bar': { StatusBar: () => null },
    'react-native-gesture-handler': { GestureHandlerRootView: native.View },
    'expo-router': { useRouter: () => router, useSegments: () => state.segments, Stack },
    'expo-linking': { useURL: () => state.linkedURL, getInitialURL: async () => state.linkedURL },
    'expo-linear-gradient': { LinearGradient: native.View },
    'lucide-react-native': new Proxy({}, { get: () => () => React.createElement('span') }),
    'expo-haptics': { ImpactFeedbackStyle: { Light: 'light' }, impactAsync: async () => {} },
    'expo/fetch': { fetch: (url, options) => { state.requests.push({ url, options }); return state.fetch(url, options) } },
  }
  function load(relativePath) {
    let file = path.resolve(testDir, '..', relativePath)
    if (!existsSync(file)) file = existsSync(`${file}.ts`) ? `${file}.ts` : `${file}.tsx`
    if (cache.has(file)) return cache.get(file).exports
    const loadedModule = { exports: {} }; cache.set(file, loadedModule)
    const source = readFileSync(file, 'utf8')
    const compiled = ts.transpileModule(source, { compilerOptions: {
      target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
    } }).outputText
    const localRequire = name => {
      if (name === '@/lib/supabase' || (name === './supabase' && file.endsWith('/mobile/lib/api.ts'))) return supabaseBoundary
      if (name in modules) return modules[name]
      if (name.startsWith('@/')) return load(`mobile/${name.slice(2)}`)
      if (name.startsWith('.')) return load(path.relative(path.resolve(testDir, '..'), path.resolve(path.dirname(file), name)))
      throw new Error(`Unexpected component dependency: ${name}`)
    }
    const setTimer = (callback, delay) => {
      const id = state.nextTimer++
      state.timers.set(id, { callback, delay })
      return id
    }
    new Function('require', 'module', 'exports', 'setTimeout', 'clearTimeout', compiled)(
      localRequire, loadedModule, loadedModule.exports, setTimer, id => state.timers.delete(id),
    )
    return loadedModule.exports
  }
  const { useAuth } = load('mobile/store/auth.ts')
  prepareAuth?.({ state, useAuth })
  await useAuth.getState().init()
  const Screen = load(screen).default
  const container = document.createElement('div'); document.body.appendChild(container)
  const root = createRoot(container)
  await act(async () => root.render(strict ? React.createElement(React.StrictMode, null, React.createElement(Screen)) : React.createElement(Screen)))
  let mounted = true
  const fixture = {
    state, container, useAuth,
    query(id) { return container.querySelector(`[data-testid="${id}"]`) },
    text() { return container.textContent },
    async input(text, id = 'chat-input') {
      const textarea = fixture.query(id)
      assert.ok(textarea, `missing ${id} input`)
      await act(async () => {
        Object.getOwnPropertyDescriptor(dom.window.HTMLTextAreaElement.prototype, 'value').set.call(textarea, text)
        textarea.dispatchEvent(new dom.window.Event('input', { bubbles: true }))
      })
    },
    async press(id = 'chat-send', count = 1) {
      await act(async () => {
        const button = fixture.query(id)
        assert.ok(button, `missing ${id} button`)
        for (let i = 0; i < count; i++) button.click()
        await tick()
      })
    },
    async settle(fn = () => undefined) { await act(async () => { await fn(); await tick() }) },
    async navigate(nextScreen, nextSegments = state.segments) {
      state.segments = nextSegments
      const Component = load(nextScreen).default
      await act(async () => {
        root.render(strict ? React.createElement(React.StrictMode, null, React.createElement(Component)) : React.createElement(Component))
        await tick()
      })
    },
    async owner(id) {
      await act(async () => {
        state.currentSession = session(id)
        for (const listener of state.authListeners) listener(id ? 'SIGNED_IN' : 'SIGNED_OUT', state.currentSession)
        await tick()
      })
    },
    async unmount() {
      if (!mounted) return
      mounted = false
      await act(async () => { root.unmount(); await tick() })
      container.remove(); activeFixtures.delete(fixture)
    },
  }
  activeFixtures.add(fixture)
  return fixture
}

function sseResponse(events, { open = false } = {}) {
  let streamController, cancellations = 0
  const body = new ReadableStream({
    start(controller) {
      streamController = controller
      if (events.length) controller.enqueue(new TextEncoder().encode(events.map(event => `data: ${JSON.stringify(event)}\n\n`).join('')))
      if (!open) controller.close()
    },
    cancel() { cancellations++ },
  })
  const response = new Response(body, { headers: { 'content-type': 'text/event-stream' } })
  response.fixture = { controller: streamController, cancellations: () => cancellations }
  return response
}


export { mount, sseResponse, deferred, CASE_A, CASE_B }
