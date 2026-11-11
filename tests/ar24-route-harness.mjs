import { registerHooks } from 'node:module'

// Routes and AR24 module are real; framework, database and email dependencies are doubled.
// The Zod double accepts fixtures. Request validation is outside this test's scope.
const sources = {
  'next/server': 'export const NextResponse = { json: (body, init) => Response.json(body, init) }',
  zod: `class ZodError extends Error {}
    const schema = new Proxy({ parse: (value) => value }, { get: (target, key) => key in target ? target[key] : () => schema });
    export const z = { string: () => schema, object: () => schema, literal: () => schema, ZodError };`,
  '@/lib/supabase-server': 'export const createServerSupabaseClient = async () => globalThis.__ar24TestState.client',
  '@/lib/supabase': 'export const createServiceClient = () => globalThis.__ar24TestState.client',
  '@/lib/email/send': `export const FROM_NOTIFS = 'test@example.invalid';
    export const sendEmail = async (value) => { globalThis.__ar24TestState.emails.push(value) }`,
  '@/lib/email/templates': `export const ARReceivedEmail = (props) => props;
    export const DocumentSentConfirmation = (props) => props;`,
}
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier in sources) return { url: `ar24-test:${specifier}`, shortCircuit: true }
    if (specifier === '@/lib/ar24') return { url: new URL('../src/lib/ar24.ts', import.meta.url).href, shortCircuit: true }
    return nextResolve(specifier, context)
  },
  load(url, context, nextLoad) {
    if (url.startsWith('ar24-test:')) return { format: 'module', source: sources[url.slice(10)], shortCircuit: true }
    return nextLoad(url, context)
  },
})

export function fixture() {
  const state = {
    user: { id: 'user-test', role: 'user', subscription_plan: 'pro', full_name: 'Test', email: 'test@example.invalid' },
    doc: { id: 'doc-test', case_id: 'case-test', title: 'Test', storage_path: 'test.pdf', signature_status: 'signed', sent_status: 'not_sent', tracking_number: null },
    caseRow: { id: 'case-test', user_id: 'user-test' }, cases: [{ id: 'case-test' }],
    count: 0, countError: null, casesError: null, updateError: null, missingUpdate: false,
    pending: [], writes: [], emails: [], requests: [], downloads: 0, queries: [],
    provider: () => new Response(JSON.stringify({ tracking_number: 'provider-123', cost: 5.99 })),
  }
  class Query {
    constructor(table) { this.table = table; this.op = 'select'; this.filters = [] }
    select(_columns, options) { if (options?.count) this.counted = true; return this }
    eq(...args) { this.filters.push(['eq', ...args]); return this }
    is(...args) { this.filters.push(['is', ...args]); return this }
    in(...args) { this.filters.push(['in', ...args]); return this }
    gte(...args) { this.filters.push(['gte', ...args]); return this }
    not(...args) { this.filters.push(['not', ...args]); return this }
    limit() { return this }
    update(payload) { this.op = 'update'; this.payload = payload; return this }
    insert(payload) { this.op = 'insert'; this.payload = payload; return this }
    maybeSingle() { this.single = true; return this }
    then(resolve, reject) {
      try {
        state.queries.push({ table: this.table, op: this.op })
        let result
        if (this.op !== 'select') {
          state.writes.push({ table: this.table, op: this.op, payload: this.payload, filters: this.filters })
          result = this.table === 'jurispurama_documents'
            ? { data: state.missingUpdate ? null : { id: 'doc-test' }, error: state.updateError }
            : { data: { id: 'test-write' }, error: null }
        } else if (this.table === 'jurispurama_users') result = { data: state.user }
        else if (this.table === 'jurispurama_cases') result = { data: this.single ? state.caseRow : state.cases, error: state.casesError }
        else if (this.counted) result = { count: state.count, error: state.countError }
        else result = { data: this.single ? state.doc : state.pending }
        return Promise.resolve(result).then(resolve, reject)
      } catch (error) { return Promise.reject(error).then(resolve, reject) }
    }
  }
  state.client = {
    auth: { getUser: async () => ({ data: { user: { id: 'auth-test' } } }) },
    from: (table) => new Query(table),
    storage: { from: () => ({ download: async () => { state.downloads++; return { data: new Blob(['%PDF-test']) } } }) },
  }
  globalThis.__ar24TestState = state
  globalThis.fetch = async (...args) => { state.requests.push(args); return state.provider(...args) }
  return state
}
export function request() {
  return new Request('https://app.invalid/api/documents/doc-test/send-recommande', {
    method: 'POST', body: JSON.stringify({ recipientName: 'Test', recipientAddress: { street: '1 rue Test', zip: '75001', city: 'Paris', country: 'FR' } }),
  })
}
export const context = { params: Promise.resolve({ id: 'doc-test' }) }
export function cronRequest() {
  return new Request('https://app.invalid/api/cron/check-ar-status', { headers: { authorization: 'Bearer cron-test-not-real' } })
}
