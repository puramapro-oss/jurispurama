import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { deferred } from './lifecycle-source.mjs'

const baseRef = process.env.JURIS_AUTH_TEST_BASE_REF
if (baseRef && !/^[a-f0-9]{40}$/.test(baseRef)) throw new Error('Expected a full commit SHA')
const file = 'src/hooks/useAuth.ts'
const source = baseRef
  ? execFileSync('git', ['show', `${baseRef}:${file}`], { encoding: 'utf8' })
  : readFileSync(file, 'utf8')
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText

export const sessionFor = (id, token = 'first-token') => ({ user: { id, email: `${id}@example.test` }, access_token: token })
export const profileFor = id => ({ id: `profile-${id}`, auth_user_id: id, role: 'user' })
export const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve() }

// Execute the real hook and its effects. Only React scheduling, the clock and
// Supabase transport are controlled; no service credentials or sockets are used.
export function harness() {
  const initial = deferred(), requests = [], updates = [], slots = [], effects = new Map(), timers = new Map()
  let index = 0, timerId = 0, subscriber, subscriptions = 0, unsubscriptions = 0, insideAuthCallback = false
  const same = (a, b) => a?.length === b?.length && a.every((value, i) => Object.is(value, b[i]))
  const pendingEffects = []
  const react = {
    useState(value) {
      const slot = index++
      if (!(slot in slots)) slots[slot] = typeof value === 'function' ? value() : value
      return [slots[slot], next => {
        slots[slot] = typeof next === 'function' ? next(slots[slot]) : next
        updates.push({ slot, value: slots[slot] })
      }]
    },
    useRef(value) { const slot = index++; return slots[slot] ??= { current: value } },
    useCallback(fn, deps) {
      const slot = index++
      if (!same(slots[slot]?.deps, deps)) slots[slot] = { fn, deps }
      return slots[slot].fn
    },
    useEffect(fn, deps) {
      const slot = index++
      if (!same(slots[slot]?.deps, deps)) {
        slots[slot] = { fn, deps }
        pendingEffects.push({ slot, fn })
      }
    },
  }
  const client = {
    auth: {
      getSession: () => initial.promise,
      onAuthStateChange: callback => {
        subscriber = callback; subscriptions++
        return { data: { subscription: { unsubscribe() { unsubscriptions++ } } } }
      },
    },
    from(table) {
      const request = { table, kind: 'read', insideAuthCallback }
      const query = {
        select() { return query },
        eq(field, value) { request.field = field; request.userId = value; return query },
        insert(value) { request.kind = 'insert'; request.value = value; return query },
        maybeSingle() {
          const pending = deferred(); Object.assign(request, pending); requests.push(request)
          return pending.promise
        },
      }
      return query
    },
  }
  const exports = {}
  vm.runInNewContext(compiled, {
    exports,
    require(name) {
      if (name === 'react') return react
      if (name === '@/lib/supabase') return { createClient: () => client }
      if (name === '@/lib/constants') return { SUPER_ADMIN_EMAIL: 'admin@example.test' }
      if (name === '@/lib/utils') return { generateReferralCode: () => 'fixture-referral' }
      throw new Error(`Unexpected import: ${name}`)
    },
    setTimeout(fn) { const id = ++timerId; timers.set(id, fn); return id },
    clearTimeout(id) { timers.delete(id) },
  })
  function render() {
    index = 0
    const result = exports.useAuth()
    for (const { slot, fn } of pendingEffects.splice(0)) {
      effects.get(slot)?.()
      effects.set(slot, fn())
    }
    return result
  }
  render()
  return {
    initial, requests, updates, render,
    get subscriptions() { return subscriptions },
    get unsubscriptions() { return unsubscriptions },
    get state() { return { user: slots[0], profile: slots[1], session: slots[2], loading: slots[3] } },
    emit(event, session) {
      insideAuthCallback = true
      try { return subscriber(event, session) } finally { insideAuthCallback = false }
    },
    async start(session) { initial.resolve({ data: { session }, error: null }); await flush(); await this.tick() },
    async tick() { for (const [id, fn] of [...timers]) { timers.delete(id); fn() }; await flush() },
    async resolve(index, data, error = null) { requests[index].resolve({ data, error }); await flush() },
    cleanup() { for (const cleanup of effects.values()) cleanup?.(); effects.clear() },
    replayEffects() {
      for (const [slot, cleanup] of effects) {
        cleanup?.()
        effects.set(slot, slots[slot].fn())
      }
    },
  }
}

