import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire, stripTypeScriptTypes } from 'node:module';
import { createCipheriv, createDecipheriv, createHash } from 'node:crypto';

const require = createRequire(process.env.JURIS_TEST_DEPENDENCY_ROOT
  ? path.resolve(process.env.JURIS_TEST_DEPENDENCY_ROOT, 'package.json')
  : new URL('../package.json', import.meta.url));
const { z } = require('zod');
const Stripe = require('stripe');
const root = process.env.JURIS_SOURCE_ROOT ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = file => fs.readFileSync(path.join(root, file), 'utf8');
const routeSource = source('src/app/api/stripe/checkout-unit/route.ts');
const ar24Source = source('src/lib/ar24.ts');
const stripeSource = source('src/lib/stripe.ts');

async function loadRoute(env) {
  const calls = { auth: 0, database: 0, stripe: 0, price: 0, provider: 0 };
  const context = vm.createContext({
    process: { env }, URL, Error,
    fetch: () => { calls.provider++; throw new Error('Provider calls forbidden'); },
  }, { codeGeneration: { strings: false, wasm: false } });
  const modules = new Map();
  for (const [specifier, exports] of Object.entries({
    'next/server': { NextResponse: { json: (body, init = {}) => ({ body, status: init.status ?? 200 }) } },
    zod: { z },
    '@/lib/stripe': {
      getStripe: () => { calls.stripe++; throw new Error('Stripe calls forbidden'); },
      resolveUnitPriceId: () => { calls.price++; throw new Error('Price access forbidden'); },
    },
    '@/lib/supabase-server': { createServerSupabaseClient: async () => {
      calls.auth++;
      return {
        auth: { getUser: async () => ({ data: { user: null } }) },
        from: () => { calls.database++; throw new Error('Database calls forbidden'); },
      };
    } },
    '@/lib/constants': { APP_DOMAIN: 'qualification.invalid' },
  })) {
    modules.set(specifier, new vm.SyntheticModule(Object.keys(exports), function () {
      Object.entries(exports).forEach(([key, value]) => this.setExport(key, value));
    }, { context }));
  }
  modules.set('@/lib/ar24', new vm.SourceTextModule(stripTypeScriptTypes(ar24Source), { context }));
  modules.set('./ar24-error.ts', new vm.SourceTextModule(stripTypeScriptTypes(source('src/lib/ar24-error.ts')), { context }));
  modules.set('./ar24-protocol.ts', new vm.SourceTextModule(stripTypeScriptTypes(source('src/lib/ar24-protocol.ts')), { context }));
  const crypto = { createCipheriv, createDecipheriv, createHash };
  modules.set('node:crypto', new vm.SyntheticModule(Object.keys(crypto), function () {
    Object.entries(crypto).forEach(([key, value]) => this.setExport(key, value));
  }, { context }));
  const handler = new vm.SourceTextModule(stripTypeScriptTypes(routeSource), { context });
  await handler.link(specifier => {
    assert(modules.has(specifier), `Unexpected dependency ${specifier}`);
    return modules.get(specifier);
  });
  await handler.evaluate();
  return { handler: handler.namespace, calls };
}

const request = type => ({ json: async () => ({ type, idempotencyKey: '550e8400-e29b-41d4-a716-446655440000' }) });

for (const [label, env] of [
  ['disabled', { AR24_ENABLED: 'false', AR24_API_KEY: 'fake-key-no-provider' }],
  ['key alone', { AR24_API_KEY: 'fake-key-no-provider' }],
  ['enabled without key', { AR24_ENABLED: 'true' }],
]) {
  test(`AR24 checkout ${label} refuses before authentication, database or payment`, async () => {
    const { handler, calls } = await loadRoute(env);
    const response = await handler.POST(request('recommande_ar'));
    assert.equal(response.status, 503);
    assert.equal(response.body.code, 'ar24_unavailable');
    assert.deepEqual(calls, { auth: 0, database: 0, stripe: 0, price: 0, provider: 0 });
  });
}

test('even complete transport credentials cannot enable unqualified AR24 checkout', async () => {
  const { handler, calls } = await loadRoute({ AR24_ENABLED: 'true', AR24_API_KEY: 'fake-key-no-provider', AR24_PRIVATE_KEY: 'fake-private-key' });
  assert.equal((await handler.POST(request('recommande_ar'))).status, 503);
  assert.deepEqual(calls, { auth: 0, database: 0, stripe: 0, price: 0, provider: 0 });
});

test('another unit type retains its authentication check when AR24 is unavailable', async () => {
  const { handler, calls } = await loadRoute({});
  assert.equal((await handler.POST(request('signature_supplementaire'))).status, 401);
  assert.deepEqual(calls, { auth: 1, database: 0, stripe: 0, price: 0, provider: 0 });
});

test('AR24 catalogue description does not promise legal qualification from the repealed reference', async () => {
  const context = vm.createContext({ process: { env: {} }, Error });
  const sdk = new vm.SyntheticModule(['default'], function () { this.setExport('default', Stripe); }, { context });
  const catalogue = new vm.SourceTextModule(stripTypeScriptTypes(stripeSource), { context });
  await catalogue.link(specifier => { assert.equal(specifier, 'stripe'); return sdk; });
  await catalogue.evaluate();
  assert.doesNotMatch(catalogue.namespace.JURIS_UNITS.recommande_ar.description, /1369-7|valeur l[ée]gale/i);
});
