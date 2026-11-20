import { registerHooks } from 'node:module'

// Routes and tracking transport are real; framework, database and emails are doubled.
// Sending uses an explicit candidate double only for persistence/quota regressions.
// A separate route test uses the real closed send gate; no fixture qualifies live sending.
// The Zod double accepts fixtures. Request validation is outside this test's scope.
const sources = {
  'next/server': 'export const NextResponse = { json: (body, init) => Response.json(body, init) }',
  '@react-email/components': 'export const render = async value => JSON.stringify(value)',
  zod: `class ZodError extends Error {}
    const schema = new Proxy({ parse: (value) => value }, { get: (target, key) => key in target ? target[key] : () => schema });
    export const z = { string: () => schema, object: () => schema, literal: () => schema, ZodError };`,
  '@/lib/supabase-server': 'export const createServerSupabaseClient = async () => globalThis.__ar24TestState.client',
  '@/lib/supabase': 'export const createServiceClient = () => globalThis.__ar24TestState.client',
  '@/lib/email/send': `export const FROM_NOTIFS = 'test@example.invalid';
    export const sendEmail = async (value) => {
      const state = globalThis.__ar24TestState; state.emails.push(value);
      return state.emailResult ? state.emailResult(value) : { ok: true };
    }`,
  '@/lib/email/templates': `export const ARReceivedEmail = (props) => props;
    export const DocumentSentConfirmation = (props) => props;`,
  '@/lib/ar24': `import * as real from '${new URL('../src/lib/ar24.ts', import.meta.url).href}';
    import { ar24Config } from '${new URL('../src/lib/ar24-protocol.ts', import.meta.url).href}';
    export { pollStatus, assertAR24TrackingConfigured, AR24Error } from '${new URL('../src/lib/ar24.ts', import.meta.url).href}';
    export const assertAR24Configured = () => {
      if (!globalThis.__ar24TestState.allowSenderFixture) return real.assertAR24Configured();
      ar24Config();
    };
    export const sendRecommande = async input => {
      if (!globalThis.__ar24TestState.allowSenderFixture) return real.sendRecommande(input);
      globalThis.__ar24TestState.adapterSends++;
      return globalThis.__ar24TestState.sendResult(input);
    };`,
}
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier in sources) return { url: `ar24-test:${specifier}`, shortCircuit: true }
    if (specifier === '@/lib/ar24-budget' || specifier === '@/lib/ar24-email') return { url: new URL(`../src/lib/${specifier.slice(6)}.ts`, import.meta.url).href, shortCircuit: true }
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
    control: new Map(), outbox: [], emailRequests: [], now: Date.now(), beforeRpc: null, afterRpc: null,
    allowSenderFixture: false, adapterSends: 0, beforeQuery: null, emailResult: null,
    sendResult: () => ({ mode: 'live', tracking_number: '123', cost: 5.99, estimated_delivery: null }),
    provider: () => { throw new Error('Network forbidden; configure an encrypted fixture explicitly') },
  }
  // Routing double only. Real SQL fairness, transactions, leases/RLS are tested
  // in ar24-postgres.py, not inferred from this simplified in-memory queue.
  let serial = 0
  class Rpc {
    constructor(name, args) { this.name = name; this.args = args }
    abortSignal(signal) { this.signal = signal; return this }
    then(resolve, reject) {
      return Promise.resolve().then(async () => {
        await state.beforeRpc?.(this); this.signal?.throwIfAborted()
        state.queries.push({ rpc: this.name, args: this.args })
        const a = this.args
        let data = null
        if (this.name === 'ar24_sync_tracking') {
          for (const doc of state.pending) if (!state.control.has(doc.id)) state.control.set(doc.id, { doc, due: state.now, leaseUntil: 0 })
          data = 0
        } else if (this.name === 'ar24_claim_tracking') {
          const q = [...state.control.values()].filter(q => q.due <= state.now && q.leaseUntil <= state.now).sort((a, b) => a.due - b.due)[0]
          if (q) { q.token = `lease-${++serial}`; q.leaseUntil = state.now + 120_000; q.due = state.now;
            data = { document_id: q.doc.id, lease_token: q.token, tracking_number: q.doc.tracking_number, sent_at: q.doc.sent_at } }
        } else if (this.name === 'ar24_complete_tracking') {
          const q = state.control.get(a.p_document_id)
          if (q?.token === a.p_lease_token) {
            if (a.p_received_at) {
              state.writes.push({ table: 'jurispurama_documents', payload: { ar_received_at: a.p_received_at }, filters: [['is', 'ar_received_at', null]] })
              if (state.updateError) return { data: null, error: state.updateError }
              if (!state.missingUpdate) {
                state.pending = state.pending.filter(doc => doc.id !== q.doc.id); state.control.delete(q.doc.id)
                state.outbox.push({ id: `00000000-0000-4000-8000-${String(++serial).padStart(12, '0')}`, due: state.now, leaseUntil: 0,
                  payload: null, state: 'pending', email: state.user.email, user_name: state.user.full_name,
                  facts: { document_id: q.doc.id, document_title: q.doc.title, recipient: q.doc.sent_to ?? 'destinataire', received_at: a.p_received_at } })
                data = { persisted: true }
              }
            } else { q.due = state.now + (a.p_error ? 900_000 : 21_600_000); q.leaseUntil = 0; data = { rescheduled: true, persisted: false } }
          }
        } else if (this.name === 'ar24_claim_notification') {
          const event = state.outbox.find(e => e.state === 'pending' && e.due <= state.now && e.leaseUntil <= state.now)
          if (event) { event.lease_token = `lease-${++serial}`; event.leaseUntil = state.now + 120_000; data = { ...event } }
        } else if (this.name === 'ar24_begin_notification') {
          const event = state.outbox.find(e => e.id === a.p_id && e.lease_token === a.p_lease_token)
          if (event) {
            event.payload ??= a.p_payload; event.firstAttempt ??= state.now
            data = { payload: event.payload, idempotency_key: `juris-ar24-receipt/${event.id}`, retry_until: new Date(event.firstAttempt + 82_800_000).toISOString() }
          }
        } else if (this.name === 'ar24_finish_notification') {
          const event = state.outbox.find(e => e.id === a.p_id && e.lease_token === a.p_lease_token)
          data = Boolean(event)
          if (event) { event.state = a.p_provider_id ? 'sent' : a.p_reconcile ? 'reconcile' : 'pending'; event.leaseUntil = 0; event.due = state.now + 900_000 }
        } else if (this.name === 'ar24_queue_status') data = {
          tracking_due: [...state.control.values()].filter(q => q.due <= state.now).length,
          email_due: state.outbox.filter(e => e.state === 'pending' && e.due <= state.now).length,
          reconciliation: state.outbox.filter(e => e.state === 'reconcile').length,
        }
        await state.afterRpc?.(this, data)
        return { data, error: null }
      }).then(resolve, reject)
    }
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
    abortSignal(signal) { this.signal = signal; return this }
    then(resolve, reject) {
      return Promise.resolve().then(async () => {
        await state.beforeQuery?.(this)
        this.signal?.throwIfAborted()
        state.queries.push({ table: this.table, op: this.op })
        let result
        if (this.op !== 'select') {
          state.writes.push({ table: this.table, op: this.op, payload: this.payload, filters: this.filters })
          result = this.table === 'jurispurama_documents'
            ? { data: state.missingUpdate ? null : { id: 'doc-test' }, error: state.updateError }
            : { data: { id: 'test-write' }, error: null }
          if (this.table === 'jurispurama_documents' && this.payload.ar_received_at && !state.missingUpdate && !state.updateError) {
            const id = this.filters.find(filter => filter[0] === 'eq' && filter[1] === 'id')?.[2]
            state.pending = state.pending.filter(doc => doc.id !== id)
          }
        } else if (this.table === 'jurispurama_users') result = { data: state.user }
        else if (this.table === 'jurispurama_cases') result = { data: this.single ? state.caseRow : state.cases, error: state.casesError }
        else if (this.counted) result = { count: state.count, error: state.countError }
        else result = { data: this.single ? state.doc : state.pending }
        return result
      }).then(resolve, reject)
    }
  }
  state.client = {
    auth: { getUser: async () => ({ data: { user: { id: 'auth-test' } } }) },
    from: (table) => new Query(table),
    rpc: (name, args) => new Rpc(name, args),
    storage: { from: () => ({ download: async () => { state.downloads++; return { data: new Blob(['%PDF-test']) } } }) },
  }
  globalThis.__ar24TestState = state
  globalThis.fetch = async (...args) => {
    if (args[0] === 'https://api.resend.com/emails') {
      state.emailRequests.push(args); state.emails.push(JSON.parse(args[1].body))
      const result = await state.emailResult?.(...args) ?? { ok: true }
      return result instanceof Response ? result : Response.json(result.ok ? { id: result.id ?? 'provider-test-id' } : { name: 'provider_failure', message: result.error }, { status: result.ok ? 200 : 500 })
    }
    state.requests.push(args); return state.provider(...args)
  }
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
