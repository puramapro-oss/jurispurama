import test from 'node:test'
import assert from 'node:assert/strict'
import { createCipheriv, createHash } from 'node:crypto'
import { pathToFileURL } from 'node:url'

const source = process.env.AR24_MODULE_PATH
  ? pathToFileURL(process.env.AR24_MODULE_PATH).href
  : new URL('../src/lib/ar24.ts', import.meta.url).href
const { pollStatus } = await import(source)

test('official encrypted mail response is read through signed GET /api/mail', async () => {
  const keys = ['AR24_ENABLED', 'AR24_API_KEY', 'AR24_PRIVATE_KEY', 'AR24_API_URL']
  const previous = Object.fromEntries(keys.map(key => [key, process.env[key]]))
  const originalFetch = globalThis.fetch
  Object.assign(process.env, { AR24_ENABLED: 'true', AR24_API_KEY: 'synthetic-token',
    AR24_PRIVATE_KEY: 'synthetic-private-key', AR24_API_URL: 'https://sandbox.ar24.fr/api' })
  let calls = 0
  globalThis.fetch = async (url, init) => {
    calls++
    const request = new URL(url)
    assert.equal(request.pathname, '/api/mail')
    assert.equal(request.searchParams.get('id'), '123')
    assert.equal(request.searchParams.get('token'), 'synthetic-token')
    assert.equal(init.method, 'GET')
    assert.equal(init.redirect, 'error')
    assert.ok(init.headers.signature)
    assert.equal(init.headers.Authorization, undefined)
    const hash = value => createHash('sha256').update(value).digest('hex')
    const iv = Buffer.from(hash(hash('synthetic-private-key')).slice(0, 16))
    const key = Buffer.from(hash(request.searchParams.get('date') + 'synthetic-private-key').slice(0, 32))
    const cipher = createCipheriv('aes-256-cbc', key, iv)
    const result = { status: 'SUCCESS', result: { id: 123, type: 'lre', status: 'ar',
      send_fail: false, view_date: '2026-01-15 13:00:00' } }
    return new Response(Buffer.concat([cipher.update(JSON.stringify(result)), cipher.final()]).toString('base64'))
  }
  try {
    assert.deepEqual(await pollStatus('123', '2026-01-15T10:00:00Z'),
      { received: true, received_at: '2026-01-15T12:00:00.000Z' })
    assert.equal(calls, 1)
  } finally {
    globalThis.fetch = originalFetch
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }
})
