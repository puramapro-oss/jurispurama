import assert from 'node:assert/strict'
import { after, afterEach, before } from 'node:test'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const require = createRequire(new URL('../package.json', import.meta.url))
const jsdomRequire = process.env.JURIS_REACT_TEST_DEPENDENCY_ROOT
  ? createRequire(resolve(process.env.JURIS_REACT_TEST_DEPENDENCY_ROOT, 'package.json')) : require
const { JSDOM } = process.env.JURIS_REACT_TEST_JSDOM_PATH
  ? require(process.env.JURIS_REACT_TEST_JSDOM_PATH) : jsdomRequire('jsdom')
const React = require('react')
const ts = require('typescript')
export const { act } = React
export const deferred = () => Promise.withResolvers()
export const tick = () => new Promise(resolveTick => setImmediate(resolveTick))
export const sessionFor = (id = 'owner-a', token = `token-${id}`) => ({
  access_token: token, refresh_token: `refresh-${id}`, user: { id },
  token_type: 'bearer', expires_in: 3600,
})
const originals = new Map(), mounted = new Set()
let dom, createRoot

before(() => {
  dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://juris.fixture.invalid/update-password' })
  for (const [key, value] of Object.entries({ window: dom.window, document: dom.window.document,
    navigator: dom.window.navigator, HTMLElement: dom.window.HTMLElement, IS_REACT_ACT_ENVIRONMENT: true })) {
    originals.set(key, Object.getOwnPropertyDescriptor(globalThis, key))
    Object.defineProperty(globalThis, key, { value, writable: true, configurable: true })
  }
  createRoot = require('react-dom/client').createRoot
})
afterEach(async () => { for (const fixture of [...mounted]) await fixture.unmount() })
after(() => {
  dom.window.close()
  for (const [key, descriptor] of originals) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor)
    else delete globalThis[key]
  }
})

export async function mount({ session = sessionFor(), strict = false, forgot = false, prepare } = {}) {
  const state = { session, listeners: new Set(), requests: [], errors: [], successes: [],
    isolates: [], updateGate: null, getUserGate: null, initialGate: null, resetGate: null,
    userError: false, updateError: false, resetError: false, resetRequests: [] }
  const tokenOwners = new Map(session ? [[session.access_token, session.user.id]] : [])
  const remoteUser = token => ({ id: tokenOwners.get(token) ?? token?.replace(/^token-/, '') })
  const browserClient = { auth: {
    async getSession() {
      const pending = state.initialGate
      state.initialGate = null
      return pending ? pending.promise : { data: { session: state.session }, error: null }
    },
    async getUser(token) {
      if (state.getUserGate) await state.getUserGate.promise
      return { data: { user: state.userError ? null : remoteUser(token) }, error: state.userError ? new Error('rejected') : null }
    },
    onAuthStateChange(listener) {
      state.listeners.add(listener)
      return { data: { subscription: { unsubscribe() { state.listeners.delete(listener) } } } }
    },
  } }
  const createPasswordUpdateClient = () => {
    let isolatedSession
    const client = { auth: {
      async setSession(tokens) {
        isolatedSession = { ...tokens, user: remoteUser(tokens.access_token) }
        return { data: { session: isolatedSession, user: isolatedSession.user }, error: null }
      },
      async getSession() { return { data: { session: isolatedSession }, error: null } },
      getUser: browserClient.auth.getUser,
      async updateUser(payload) {
        state.requests.push({ payload, token: isolatedSession.access_token })
        if (state.updateGate) await state.updateGate.promise
        return { data: { user: isolatedSession.user }, error: state.updateError ? new Error('server failure') : null }
      },
    } }
    state.isolates.push(client)
    return client
  }
  const resetPassword = async email => {
    state.resetRequests.push(email)
    if (state.resetGate) await state.resetGate.promise
    return { error: state.resetError ? new Error('mail failure') : null }
  }
  prepare?.(state)
  const cache = new Map()
  const doubles = {
    react: React, 'react/jsx-runtime': require('react/jsx-runtime'),
    'next/link': ({ children, href, ...props }) => React.createElement('a', { href, ...props }, children),
    '@/lib/supabase': { createClient: () => browserClient },
    '@/lib/password-update-client': { createPasswordUpdateClient },
    '@/hooks/useAuth': { useAuth: () => ({ resetPassword }) },
    '@/lib/utils': { cn: (...values) => values.filter(Boolean).join(' ') },
    sonner: { toast: { error: value => state.errors.push(value), success: value => state.successes.push(value) } },
  }
  function load(file) {
    const path = resolve(root, file)
    if (cache.has(path)) return cache.get(path).exports
    const loadedModule = { exports: {} }; cache.set(path, loadedModule)
    const source = ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: {
      target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    } }).outputText
    const localRequire = name => {
      if (Object.hasOwn(doubles, name)) return doubles[name]
      if (name.startsWith('@/')) return load(`src/${name.slice(2)}${name.includes('/components/') ? '.tsx' : '.ts'}`)
      if (name.startsWith('.')) return load(resolve(dirname(path), `${name}.ts`))
      throw new Error(`Unexpected dependency ${name}`)
    }
    new Function('require', 'module', 'exports', source)(localRequire, loadedModule, loadedModule.exports)
    return loadedModule.exports
  }
  const Page = load(`src/app/(auth)/${forgot ? 'forgot-password' : 'update-password'}/page.tsx`).default
  const container = document.createElement('div')
  document.body.appendChild(container)
  const reactRoot = createRoot(container)
  const fixture = {
    state, container,
    async settle() { await act(async () => { await tick(); await tick() }) },
    async changeSession(next, event = 'SIGNED_IN') {
      await act(async () => {
        state.session = next
        if (next) tokenOwners.set(next.access_token, next.user.id)
        for (const listener of state.listeners) listener(event, next)
        await tick()
      })
    },
    async fill(id, value) {
      const input = container.querySelector(`#${id}`)
      assert.ok(input, `${id} rendered`)
      await act(async () => {
        Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, value)
        input.dispatchEvent(new window.Event('input', { bubbles: true }))
        input.dispatchEvent(new window.Event('change', { bubbles: true }))
      })
    },
    async submit(times = 1) {
      const form = container.querySelector('form')
      assert.ok(form, 'form rendered')
      await act(async () => {
        for (let index = 0; index < times; index++) form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }))
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
    reactRoot.render(strict ? React.createElement(React.StrictMode, null, React.createElement(Page)) : React.createElement(Page))
    await tick()
  })
  return fixture
}
