import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'

// Run against a pinned original with AR24_MODULE_PATH to demonstrate both regressions.
const previous = { key: process.env.AR24_API_KEY, enabled: process.env.AR24_ENABLED, fetch: globalThis.fetch }
delete process.env.AR24_API_KEY
delete process.env.AR24_ENABLED
globalThis.fetch = async () => { throw new Error('No network permitted in regression controls') }
const moduleUrl = process.env.AR24_MODULE_PATH
  ? pathToFileURL(process.env.AR24_MODULE_PATH).href
  : new URL('../src/lib/ar24.ts', import.meta.url).href
const { sendRecommande, pollStatus } = await import(moduleUrl)
after(() => {
  for (const [env, value] of [['AR24_API_KEY', previous.key], ['AR24_ENABLED', previous.enabled]]) {
    if (value === undefined) delete process.env[env]
    else process.env[env] = value
  }
  globalThis.fetch = previous.fetch
})
test('regression: unconfigured deposit must reject instead of returning SIM success', async () => {
  await assert.rejects(sendRecommande({
    recipient: { name: 'Test', street: '1 rue Test', zip: '75001', city: 'Paris', country: 'FR' },
    documentPdfBuffer: Buffer.from('%PDF-test'), filename: 'test.pdf', subject: 'Test',
    metadata: { documentId: 'test', caseId: 'test', userId: 'test', senderName: 'Test' },
  }))
})
test('regression: three hours never prove a simulated letter was received', async () => {
  const result = await pollStatus('SIM-AR-historical', new Date(Date.now() - 10800000).toISOString())
  assert.deepEqual(result, { received: false, received_at: null })
})
