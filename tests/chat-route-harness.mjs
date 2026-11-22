import { registerHooks, createRequire } from 'node:module'
import { existsSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

const root = new URL('../', import.meta.url)
const dependencyRequire = createRequire(process.env.JURIS_TEST_DEPENDENCY_ROOT
  ? pathToFileURL(resolve(process.env.JURIS_TEST_DEPENDENCY_ROOT, 'package.json'))
  : new URL('../package.json', import.meta.url))
const zodUrl = pathToFileURL(dependencyRequire.resolve('zod')).href
const sources = {
  'next/server': 'export const NextResponse = { json: (body, init) => Response.json(body, init) }',
  '@/lib/supabase-server': `
    export const createServerSupabaseClient = async () => globalThis.__jurisChatRouteState.client;
    export const createRequestSupabaseClient = async request => ({
      client: globalThis.__jurisChatRouteState.client,
      accessToken: request.headers.get('authorization')?.slice(7),
    });`,
  '@/lib/supabase': 'export const createServiceClient = () => globalThis.__jurisChatRouteState.client',
  '@/lib/claude': `export async function* streamClaude(options) {
    const state = globalThis.__jurisChatRouteState;
    const { signal, ...data } = options;
    state.providerSignal = signal;
    state.providerCalls.push(structuredClone(data));
    state.providerStarted.resolve();
    try {
      if (state.providerGate) await state.waitForProvider(signal, state.providerGate.promise);
      if (state.providerError) throw new Error(state.providerError);
      for (const chunk of state.providerChunks) yield chunk;
      state.beforeProviderEnd?.();
    } finally {
      state.providerFinally++;
      state.providerDone.resolve();
    }
  }`,
}

// The real route, Zod schema, prompts, metadata parser and update helper run.
// Only the framework response, database boundary and model transport are doubled.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier in sources) return { url: `juris-chat-test:${specifier}`, shortCircuit: true }
    if (specifier === 'zod') return { url: zodUrl, shortCircuit: true }
    if (specifier.startsWith('@/')) return { url: new URL(`src/${specifier.slice(2)}.ts`, root).href, shortCircuit: true }
    if (specifier.startsWith('.') && context.parentURL?.startsWith(root.href)) {
      const target = new URL(`${specifier}.ts`, context.parentURL)
      if (existsSync(fileURLToPath(target))) return { url: target.href, shortCircuit: true }
    }
    return nextResolve(specifier, context)
  },
  load(url, context, nextLoad) {
    if (url.startsWith('juris-chat-test:')) return { format: 'module', source: sources[url.slice(16)], shortCircuit: true }
    return nextLoad(url, context)
  },
})

export const CASE_ID = '00000000-0000-4000-8000-000000000001'
export function historyRows(count, { tied = false } = {}) {
  return Array.from({ length: count }, (_, i) => ({
    id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
    case_id: CASE_ID,
    role: i % 2 === 0 ? 'user' : 'assistant',
    content: `historique-${i + 1}`,
    created_at: new Date(Date.UTC(2026, 0, 1, 0, 0, tied ? 0 : i)).toISOString(),
  }))
}

export function fixture(rows = []) {
  const state = {
    rows: structuredClone(rows), queries: [], writes: [], providerCalls: [], authCalls: [],
    authUser: { id: 'auth-user' }, authError: null,
    profile: { id: 'profile-user', full_name: 'Fixture', email: 'fixture@example.invalid', subscription_plan: 'essentiel' },
    caseFound: true, caseCreationReceiptMissing: false, createdCaseId: CASE_ID, count: 0, historyError: null, historyMissing: false,
    userInsertError: null, userReceiptMissing: false,
    assistantInsertError: null, assistantReceiptMissing: false,
    metadataError: null, metadataReceiptMissing: false,
    providerChunks: ['Réponse de test.'], providerError: null,
    providerGate: null, providerSignal: null, providerFinally: 0,
    providerStarted: Promise.withResolvers(), providerDone: Promise.withResolvers(),
    beforeProviderEnd: null, beforeQuery: null, afterQuery: null, ignoreProviderAbort: false,
  }
  state.waitForProvider = (signal, promise) => new Promise((resolveGate, rejectGate) => {
    if (state.ignoreProviderAbort) { promise.then(resolveGate, rejectGate); return }
    const abort = () => rejectGate(signal.reason ?? new DOMException('Aborted', 'AbortError'))
    if (signal?.aborted) { abort(); return }
    signal?.addEventListener('abort', abort, { once: true })
    const cleanup = () => signal?.removeEventListener('abort', abort)
    promise.then(value => { cleanup(); resolveGate(value) }, error => { cleanup(); rejectGate(error) })
  })
  class Query {
    constructor(table) { this.table = table; this.op = 'select'; this.filters = []; this.orders = [] }
    select(columns, options) { this.columns = columns; this.counted = Boolean(options?.count); return this }
    eq(key, value) { this.filters.push(['eq', key, value]); return this }
    in(key, values) { this.filters.push(['in', key, values]); return this }
    gte(key, value) { this.filters.push(['gte', key, value]); return this }
    order(key, options) { this.orders.push([key, options?.ascending !== false]); return this }
    limit(value) { this.maximum = value; return this }
    insert(payload) { this.op = 'insert'; this.payload = payload; return this }
    update(payload) { this.op = 'update'; this.payload = payload; return this }
    maybeSingle() { this.single = true; return this }
    single() { this.single = true; return this }
    abortSignal(signal) { this.signal = signal; return this }
    then(resolveQuery, rejectQuery) {
      return Promise.resolve().then(async () => {
        await state.beforeQuery?.(this)
        this.signal?.throwIfAborted()
        state.queries.push({ table: this.table, op: this.op, filters: this.filters, orders: this.orders, maximum: this.maximum })
        if (this.op === 'insert') {
          state.writes.push({ table: this.table, op: this.op, payload: structuredClone(this.payload) })
          if (this.table === 'jurispurama_cases') return { data: state.caseCreationReceiptMissing ? {} : { id: state.createdCaseId }, error: null }
          const isUser = this.payload.role === 'user'
          const error = isUser ? state.userInsertError : state.assistantInsertError
          const missing = isUser ? state.userReceiptMissing : state.assistantReceiptMissing
          const id = isUser ? 'saved-current-user' : 'saved-current-assistant'
          if (!error && !missing) state.rows.push({ ...this.payload, id, created_at: '2026-02-01T00:00:00.000Z' })
          return { data: error || missing ? null : { id }, error }
        }
        if (this.op === 'update') {
          state.writes.push({ table: this.table, op: this.op, payload: structuredClone(this.payload) })
          return { data: state.metadataReceiptMissing ? null : { id: CASE_ID }, error: state.metadataError }
        }
        if (this.table === 'jurispurama_users') return { data: state.profile, error: null }
        if (this.table === 'jurispurama_legal_profiles') return { data: null, error: null }
        if (this.table === 'jurispurama_cases') return this.counted
          ? { count: state.count, error: null }
          : { data: state.caseFound ? { id: CASE_ID, user_id: state.profile.id } : null, error: null }
        if (this.table !== 'jurispurama_messages') throw new Error(`Unexpected table: ${this.table}`)
        if (state.historyError || state.historyMissing) return { data: null, error: state.historyError }
        let rows = [...state.rows]
        for (const [op, key, value] of this.filters) {
          if (op === 'eq') rows = rows.filter(row => row[key] === value)
          if (op === 'in') rows = rows.filter(row => value.includes(row[key]))
        }
        rows.sort((a, b) => {
          for (const [key, ascending] of this.orders) {
            const order = a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0
            if (order) return ascending ? order : -order
          }
          return 0
        })
        if (this.maximum !== undefined) rows = rows.slice(0, this.maximum)
        return { data: rows, error: null }
      }).then(async result => {
        await state.afterQuery?.(this, result)
        return result
      }).then(resolveQuery, rejectQuery)
    }
  }
  state.client = {
    auth: { getUser: async token => {
      state.authCalls.push(token)
      return { data: { user: state.authUser }, error: state.authError }
    } },
    from: table => new Query(table),
  }
  globalThis.__jurisChatRouteState = state
  return state
}

export function request(body = {}, headers = {}, signal) {
  return new Request('https://juris.example.invalid/api/ai/chat', {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, signal,
    body: JSON.stringify({ caseId: CASE_ID, message: 'demande-courante', ...body }),
  })
}
export async function events(response) {
  const text = await response.text()
  return text.split('\n\n').filter(line => line.startsWith('data: ') && !line.includes('[DONE]'))
    .map(line => JSON.parse(line.slice(6)))
}
