import assert from 'node:assert/strict'
import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
import { stripTypeScriptTypes } from 'node:module'
import vm from 'node:vm'

export { createBackend, instantiateHandler, requestRow } from '../docs/audit-juridique-2026-11-11/cron/harness.mjs'

export function readRoute(path) {
  const reference = process.env.JURIS_BASELINE_REF
  return reference
    ? execFileSync('git', ['show', `${reference}:${path}`], { encoding: 'utf8' })
    : fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
}

export async function instantiateAccount(backend, source, options = {}) {
  const context = vm.createContext({ Date, Error }, {
    name: 'jurispurama-cancellation-isolated-tests',
    codeGeneration: { strings: false, wasm: false },
  })
  const client = {
    from: (...args) => backend.service.from(...args),
    auth: {
      getUser: async () => ({ data: { user: options.authorized === false ? null : { id: options.userId ?? backend.rows[0]?.user_id ?? 'fake-no-request' } } }),
    },
  }
  // DELETE does not invoke the POST schema. Its Zod dependency is only stubbed
  // so the real route module can be instantiated; POST validation is not tested.
  const schema = new Proxy({}, { get: () => () => schema })
  const dependencies = {
    'next/server': { NextResponse: { json: (body, init = {}) => ({ status: init.status ?? 200, body: structuredClone(body) }) } },
    zod: { z: options.zod ?? { object: () => schema, string: () => schema, literal: () => schema } },
    '@/lib/supabase-server': { createServerSupabaseClient: async () => client },
    '@/lib/rate-limit': { rateLimit: async () => ({ allowed: options.allowed !== false }) },
  }
  const modules = new Map(Object.entries(dependencies).map(([specifier, exports]) => [specifier,
    new vm.SyntheticModule(Object.keys(exports), function () {
      Object.entries(exports).forEach(([name, value]) => this.setExport(name, value))
    }, { context, identifier: `stub:${specifier}` }),
  ]))
  const route = new vm.SourceTextModule(stripTypeScriptTypes(source, { mode: 'strip' }), { context })
  await route.link(specifier => {
    assert(modules.has(specifier), `Unexpected dependency: ${specifier}`)
    return modules.get(specifier)
  })
  await route.evaluate()
  return route.namespace
}

export const instantiateCancellation = instantiateAccount

export function beforeFirstClaim(backend, callback) {
  const originalFrom = backend.service.from
  let queries = 0
  backend.service.from = (...args) => {
    const query = originalFrom(...args)
    if (++queries === 2) {
      const originalThen = query.then.bind(query)
      query.then = (resolve, reject) => Promise.resolve().then(callback).then(() => originalThen(resolve, reject), reject)
    }
    return query
  }
}
