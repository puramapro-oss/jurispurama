import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire, stripTypeScriptTypes } from 'node:module';

const require = createRequire(process.env.JURIS_TEST_DEPENDENCY_ROOT
  ? path.resolve(process.env.JURIS_TEST_DEPENDENCY_ROOT, 'package.json')
  : new URL('../package.json', import.meta.url));
const Stripe = require('stripe');

const root = process.env.JURIS_SOURCE_ROOT ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const routeSource = fs.readFileSync(path.join(root, 'src/app/api/stripe/connect/account-session/route.ts'), 'utf8');
const stripeSource = fs.readFileSync(path.join(root, 'src/lib/stripe.ts'), 'utf8');

async function loadRoute(env, user = null) {
  // Only an explicit, fake env object is exposed; no process or network capability.
  const context = vm.createContext({ process: { env }, Error }, {
    codeGeneration: { strings: false, wasm: false },
  });
  const calls = { auth: 0, database: 0 };
  const modules = new Map();
  for (const [specifier, exports] of Object.entries({
    stripe: { default: Stripe },
    'next/server': { NextResponse: { json: (body, init = {}) => ({ body, status: init.status ?? 200 }) } },
    '@/lib/supabase-server': { createServerSupabaseClient: async () => ({
      auth: { getUser: async () => { calls.auth++; return { data: { user } }; } },
      from: () => { calls.database++; throw new Error('Database calls forbidden in this test'); },
    }) },
  })) {
    modules.set(specifier, new vm.SyntheticModule(Object.keys(exports), function () {
      Object.entries(exports).forEach(([key, value]) => this.setExport(key, value));
    }, { context }));
  }
  modules.set('@/lib/stripe', new vm.SourceTextModule(stripTypeScriptTypes(stripeSource), { context }));
  const handler = new vm.SourceTextModule(stripTypeScriptTypes(routeSource), { context });
  await handler.link(specifier => {
    assert(modules.has(specifier), `Unexpected dependency ${specifier}`);
    return modules.get(specifier);
  });
  await handler.evaluate();
  return { handler: handler.namespace, calls };
}

test('disabled Connect route imports without a Stripe key and returns 503 before auth or DB', async () => {
  const { handler, calls } = await loadRoute({});
  const response = await handler.POST({});
  assert.equal(response.status, 503);
  assert.equal(response.body.phase, 1);
  assert.deepEqual(calls, { auth: 0, database: 0 });
});

test('enabled Connect route rejects an unauthenticated request before requiring Stripe configuration', async () => {
  const { handler, calls } = await loadRoute({ TREEZOR_ACTIVE: 'true' });
  assert.equal((await handler.POST({})).status, 401);
  assert.deepEqual(calls, { auth: 1, database: 0 });
});

test('enabled authenticated Connect route without a key fails instead of returning a fake session', async () => {
  const { handler, calls } = await loadRoute({ TREEZOR_ACTIVE: 'true' }, { id: 'fake-user' });
  const response = await handler.POST({});
  assert.equal(response.status, 500);
  assert.match(response.body.detail, /STRIPE_SECRET_KEY manquant/);
  assert.equal(response.body.client_secret, undefined);
  assert.deepEqual(calls, { auth: 1, database: 0 });
});
