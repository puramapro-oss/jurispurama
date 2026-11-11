import fs from 'node:fs';
import crypto from 'node:crypto';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { stripTypeScriptTypes } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const directory = path.dirname(fileURLToPath(import.meta.url));
const sourcePath = path.join(directory, 'route.original.ts');
const sourceBytes = fs.readFileSync(sourcePath);
const expectedBlob = 'eb21cb8f39003f88d8cf92fda00a3a86d5aa9813';
const blob = crypto.createHash('sha1')
  .update(Buffer.concat([Buffer.from(`blob ${sourceBytes.length}\0`), sourceBytes]))
  .digest('hex');
assert.equal(blob, expectedBlob, 'The handler bytes must match the GitHub source blob.');
const sourceSha256 = crypto.createHash('sha256').update(sourceBytes).digest('hex');

// Node removes types only. No body or import text of the handler is patched.
const javascript = stripTypeScriptTypes(sourceBytes.toString('utf8'), { mode: 'strip' });
const fakeNow = '2026-11-11T12:00:00.000Z';
class FixedDate extends Date {
  constructor(...args) { super(...(args.length ? args : [fakeNow])); }
  static now() { return Date.parse(fakeNow); }
}

function createBackend(initialRows, options = {}) {
  const rows = structuredClone(initialRows);
  const users = new Set(rows.map(row => row.user_id));
  const events = [];
  const deleteCalls = [];
  const failDelete = new Set(options.failDelete ?? []);
  const failCompletion = new Set(options.failCompletion ?? []);
  const failClaim = new Set(options.failClaim ?? []);

  class Query {
    constructor(table) {
      assert.equal(table, 'account_deletion_requests');
      this.table = table;
      this.operation = null;
      this.filters = [];
      this.cap = Infinity;
      this.payload = null;
    }
    select(fields) { this.operation ??= 'select'; this.fields = fields; return this; }
    update(payload) { this.operation = 'update'; this.payload = structuredClone(payload); return this; }
    insert(payload) { this.operation = 'insert'; this.payload = structuredClone(payload); return this; }
    upsert(payload) { this.operation = 'upsert'; this.payload = structuredClone(payload); return this; }
    eq(key, value) { this.filters.push({ kind: 'eq', key, value }); return this; }
    lte(key, value) { this.filters.push({ kind: 'lte', key, value }); return this; }
    limit(cap) { this.cap = cap; return this; }
    maybeSingle() { this.single = true; return this; }
    then(resolve, reject) { return Promise.resolve().then(() => this.execute()).then(resolve, reject); }
    execute() {
      const selected = rows.filter(row => this.filters.every(filter =>
        filter.kind === 'eq' ? row[filter.key] === filter.value : row[filter.key] <= filter.value
      )).slice(0, this.cap);
      const event = {
        operation: this.operation,
        table: this.table,
        filters: structuredClone(this.filters),
        matchedIds: selected.map(row => row.id),
      };
      const project = (items) => {
        const fields = this.fields?.split(',').map(field => field.trim());
        const data = fields ? items.map(row => Object.fromEntries(fields.map(field => [field, row[field]]))) : null;
        if (this.single && data?.length > 1) return { data: null, error: { message: 'Multiple rows returned.' } };
        return { data: this.single ? data?.[0] ?? null : data, error: null };
      };
      if (this.operation === 'insert' || this.operation === 'upsert') {
        const existing = rows.find(row => row.user_id === this.payload.user_id);
        if (existing && this.operation === 'insert') {
          events.push({ ...event, injectedError: '23505' });
          return { data: null, error: { code: '23505', message: 'Duplicate fake user request.' } };
        }
        const row = existing ?? { id: `fake-new-request-${rows.length + 1}`, status: 'scheduled' };
        Object.assign(row, this.payload);
        if (!existing) rows.push(row);
        events.push({ ...event, payload: structuredClone(this.payload), matchedIds: [row.id] });
        return project([row]);
      }
      if (this.operation === 'select') {
        events.push(event);
        return project(selected);
      }
      assert.equal(this.operation, 'update');
      event.payload = structuredClone(this.payload);
      if (this.payload.status === 'executing' && selected.some(row => failClaim.has(row.user_id))) {
        event.injectedError = 'SIMULATED_CLAIM_WRITE_FAILURE';
        events.push(event);
        return { data: null, error: new Error(event.injectedError) };
      }
      if (this.payload.status === 'completed' && selected.some(row => failCompletion.has(row.user_id))) {
        event.injectedError = 'SIMULATED_COMPLETION_WRITE_FAILURE';
        events.push(event);
        return { data: null, error: { message: event.injectedError } };
      }
      selected.forEach(row => Object.assign(row, this.payload));
      events.push(event);
      if (this.fields) {
        return project(selected);
      }
      return { data: null, error: null };
    }
  }

  const service = {
    from(table) { return new Query(table); },
    auth: {
      admin: {
        async deleteUser(userId) {
          deleteCalls.push(userId);
          if (failDelete.has(userId)) {
            events.push({ operation: 'auth.deleteUser', userId, injectedError: 'SIMULATED_DELETE_FAILURE' });
            return { data: null, error: new Error('SIMULATED_DELETE_FAILURE') };
          }
          users.delete(userId);
          events.push({ operation: 'auth.deleteUser', userId, deletedInFakeAuth: true });
          return { data: null, error: null };
        },
      },
    },
  };
  return {
    service, rows, events, deleteCalls, failDelete,
    snapshot: () => ({ requests: structuredClone(rows), fakeAuthUsers: [...users], deleteCalls: [...deleteCalls] }),
  };
}

async function instantiateHandler(backend, handlerSource, authorized = true) {
  const javascript = stripTypeScriptTypes(handlerSource, { mode: 'strip' });
  // The VM receives no network, filesystem, process or require capability.
  const context = vm.createContext({ Date: FixedDate, Error }, {
    name: 'jurispurama-cron-isolated-reproduction',
    codeGeneration: { strings: false, wasm: false },
  });
  const modules = new Map();
  function synthetic(specifier, exports) {
    const module = new vm.SyntheticModule(Object.keys(exports), function () {
      Object.entries(exports).forEach(([key, value]) => this.setExport(key, value));
    }, { context, identifier: `stub:${specifier}` });
    modules.set(specifier, module);
  }
  synthetic('next/server', {
    NextResponse: { json(body, init = {}) { return { status: init.status ?? 200, body: structuredClone(body) }; } },
  });
  synthetic('@/lib/cron-auth', { assertCronAuth: () => authorized ? null : ({ status: 401, body: { error: 'SIMULATED_UNAUTHORIZED' } }) });
  synthetic('@/lib/supabase', { createServiceClient: () => backend.service });

  const actualHandler = new vm.SourceTextModule(javascript, { context, identifier: sourcePath });
  await actualHandler.link(specifier => {
    assert(modules.has(specifier), `Unexpected real dependency: ${specifier}`);
    return modules.get(specifier);
  });
  await actualHandler.evaluate();
  return actualHandler.namespace;
}

function requestRow(label) {
  return {
    id: `fake-request-${label}`,
    user_id: `fake-user-${label}`,
    status: 'scheduled',
    scheduled_for: '2026-11-10T12:00:00.000Z',
  };
}


export { createBackend, instantiateHandler, requestRow, blob, sourceSha256 };
