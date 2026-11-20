import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire, stripTypeScriptTypes } from 'node:module'
import { resolve } from 'node:path'
import vm from 'node:vm'
import test from 'node:test'

const require = createRequire(resolve(process.env.JURIS_TEST_DEPENDENCY_ROOT, 'package.json'))
const { z } = require('zod')
assert.equal(require('zod/package.json').version, '4.6.6')
async function moduleAt(path) {
  const writes = []
  const client = { auth: { getUser: async () => ({ data: { user: { id: 'fixture-user' } } }) }, from(table) {
    const query = {
      select() { return query }, eq() { return query }, in() { return query }, is() { return query },
      maybeSingle: async () => ({ data: { id: 'fixture-profile' } }),
      upsert(rows) { writes.push({ table, rows }); return Promise.resolve({ error: null }) },
      update(values) { writes.push({ table, values }); return query },
      then(resolve) { return Promise.resolve({ error: null }).then(resolve) },
    }; return query
  } }
  const dependencies = {
    zod: { z },
    'next/server': { NextResponse: { json: (body, init = {}) => ({ body, status: init.status ?? 200 }) } },
    '@/lib/supabase-server': { createServerSupabaseClient: async () => client },
    '@/lib/supabase': { createServiceClient: () => client },
    '@/lib/legal/versions': { CURRENT_LEGAL_VERSIONS: { mentions: 'fixture-v1', cgu: 'fixture-v1', cgv: 'fixture-v1', confidentialite: 'fixture-v1' } },
  }
  const context = vm.createContext({ Date })
  const source = readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
  const entry = new vm.SourceTextModule(stripTypeScriptTypes(source, { mode: 'transform' }), { context })
  await entry.link(specifier => {
    const exports = dependencies[specifier]; assert.ok(exports, `Unexpected import ${specifier}`)
    return new vm.SyntheticModule(Object.keys(exports), function () { for (const [key, value] of Object.entries(exports)) this.setExport(key, value) }, { context })
  })
  await entry.evaluate(); return { module: entry.namespace, writes }
}
const req = body => ({ json: async () => body, headers: new Headers() })
test('actual chat schema accepts ten attachments and rejects overflow before parsing each item', async () => {
  const { module } = await moduleAt('src/lib/ai/chat-constants.ts')
  const attachment = { media_type: 'image/png', data: 'fixture' }
  assert.equal(module.bodySchema.safeParse({ message: 'Fixture', attachments: Array(10).fill(attachment) }).success, true)
  const overflow = Array.from({ length: 11 }, () => Object.defineProperty({}, 'url', { get() { throw new Error('oversize element must not be parsed') } }))
  assert.equal(module.bodySchema.safeParse({ message: 'Fixture', attachments: overflow }).success, false)
  assert.equal(module.bodySchema.safeParse({ message: 'Fixture' }).success, true)
})
test('actual notification PATCH accepts 100 IDs and refuses 101 before database update', async () => {
  const { module, writes } = await moduleAt('src/app/api/notifications/route.ts')
  const id = '00000000-0000-4000-8000-000000000001'
  assert.equal((await module.PATCH(req({ ids: Array(100).fill(id) }))).status, 200)
  assert.equal(writes.length, 1)
  assert.equal((await module.PATCH(req({ ids: Array(101).fill(id) }))).status, 400)
  assert.equal(writes.length, 1)
  assert.equal((await module.PATCH(req({ allRead: true }))).status, 200)
  assert.equal(writes.length, 2)
})
test('actual legal POST preserves four types/single acceptance and rejects overflow before upsert', async () => {
  const { module, writes } = await moduleAt('src/app/api/legal/accept/route.ts')
  const docTypes = ['mentions', 'cgu', 'cgv', 'confidentialite']
  assert.equal((await module.POST(req({ docTypes }))).status, 200)
  assert.equal(writes[0].rows.length, 4)
  assert.ok(writes[0].rows.every(row => row.version === 'fixture-v1'))
  assert.equal((await module.POST(req({ docTypes: [...docTypes, 'cgu'] }))).status, 400)
  assert.equal(writes.length, 1)
  assert.equal((await module.POST(req({ docType: 'cgu', version: 'client-fake' }))).status, 200)
  assert.equal(writes[1].rows[0].version, 'fixture-v1')
})
