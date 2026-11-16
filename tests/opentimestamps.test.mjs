import assert from 'node:assert/strict'
import { createHash, webcrypto } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire, stripTypeScriptTypes } from 'node:module'
import vm from 'node:vm'
import test from 'node:test'

const dependencyRoot = process.env.JURIS_TEST_DEPENDENCY_ROOT
assert.ok(dependencyRoot, 'Set JURIS_TEST_DEPENDENCY_ROOT to the locked isolated dependencies')
const require = createRequire(resolve(dependencyRoot, 'package.json'))
const upstreamRequire = createRequire(require.resolve('opentimestamps/package.json'))
const primitives = Object.fromEntries(Object.entries({ DetachedTimestampFile: 'detached-timestamp-file', Ops: 'ops', Context: 'context', Timestamp: 'timestamp', Notary: 'notary' }).map(([key, name]) => [key, require(`opentimestamps/src/${name}.js`)]))
const libRoot = fileURLToPath(new URL('../src/lib/', import.meta.url))
const calendar = 'https://alice.btc.calendar.opentimestamps.org'
const digest = data => createHash('sha256').update(data).digest()
const decode = proof => primitives.DetachedTimestampFile.deserialize([...Buffer.from(proof, 'base64')])
function serializeTimestamp(timestamp) { const writer = new primitives.Context.StreamSerialization(); timestamp.serialize(writer); return new Uint8Array(writer.getOutput()) }
function pendingResponse(init) {
  const timestamp = new primitives.Timestamp(Array.from(init.body))
  timestamp.attestations.push(new primitives.Notary.PendingAttestation(calendar))
  return new Response(serializeTimestamp(timestamp))
}
function proofFor(data, attestation = new primitives.Notary.PendingAttestation(calendar)) {
  const proof = primitives.DetachedTimestampFile.fromHash(new primitives.Ops.OpSHA256(), [...digest(data)])
  if (attestation) proof.timestamp.attestations.push(attestation)
  return Buffer.from(proof.serializeToBytes()).toString('base64')
}
async function library({ fetch: providerFetch, globals = {} } = {}) {
  const calls = []
  const context = vm.createContext({
    TextEncoder, TextDecoder, Uint8Array, ArrayBuffer, Array, atob, btoa, URL, Response, Buffer,
    AbortController, setTimeout, clearTimeout, crypto: webcrypto, performance,
    fetch: async (input, init = {}) => {
      const url = new URL(String(input)); calls.push({ url, init })
      assert.equal(init.redirect, 'error'); assert.equal(init.credentials, 'omit')
      if (providerFetch) return providerFetch(url, init)
      if (url.pathname === '/digest') return pendingResponse(init)
      if (url.pathname.startsWith('/timestamp/')) return new Response(null, { status: 404 })
      throw new Error('Unplanned HTTP is forbidden in this fixture')
    }, ...globals,
  })
  const cache = new Map()
  function load(file) {
    if (!cache.has(file)) cache.set(file, new vm.SourceTextModule(stripTypeScriptTypes(readFileSync(file, 'utf8'), { mode: 'transform' }), { context, identifier: file }))
    return cache.get(file)
  }
  const entry = load(resolve(libRoot, 'opentimestamps.ts'))
  await entry.link((specifier, parent) => {
    if (specifier === 'node:crypto') return new vm.SyntheticModule(['createHash'], function () { this.setExport('createHash', createHash) }, { context })
    if (specifier.startsWith('opentimestamps/src/')) return new vm.SyntheticModule(['default'], function () { this.setExport('default', require(specifier)) }, { context })
    assert.ok(specifier.startsWith('.')); return load(resolve(dirname(parent.identifier), specifier))
  })
  await entry.evaluate()
  return { ots: entry.namespace, core: cache.get(resolve(libRoot, 'ots-core.ts')).namespace, calls }
}

const fixtures = JSON.parse(readFileSync(new URL('./opentimestamps-official-fixtures.json', import.meta.url), 'utf8'))
for (const fixture of fixtures.fixtures) test(`official .ots fixture ${fixture.name} preserves digest and all serialized attestations`, () => {
  const bytes = Buffer.from(fixture.proof_base64, 'base64')
  assert.equal(digest(bytes).toString('hex'), fixture.proof_sha256)
  const proof = decode(fixture.proof_base64)
  assert.equal(Buffer.from(proof.fileDigest()).toString('hex'), fixture.content_sha256)
  assert.deepEqual(Buffer.from(proof.serializeToBytes()), bytes)
})

test('stampHash and stampDocument preserve UTF-8 content and legacy hex-string semantics', async () => {
  const { ots } = await library()
  for (const text of ['Contrat signé — café ☀', 'abcdef0123456789'.repeat(4)]) {
    const result = await ots.stampDocument(text)
    assert.equal(result.hashSha256, digest(text).toString('hex'))
    assert.equal(Buffer.from(decode(result.proofBase64).fileDigest()).toString('hex'), result.hashSha256)
    assert.ok(Number.isFinite(Date.parse(result.stampedAt)))
    assert.ok(decode(result.proofBase64).timestamp.allAttestations().size > 0)
    assert.equal((await ots.verifyProof(text, result.proofBase64)).pending, true)
  }
})
test('Buffer view is copied before asynchronous calendar work and excludes surrounding bytes', async () => {
  const { ots } = await library(); const original = Buffer.from([37, 80, 68, 70, 0, 128, 255])
  const backing = Buffer.concat([Buffer.from([1]), original, Buffer.from([2])])
  const view = backing.subarray(1, -1); const operation = ots.stampHash(view); view.fill(0)
  assert.deepEqual(Buffer.from(decode(await operation).fileDigest()), digest(original))
})
for (const variant of ['all fail', 'only one accepts', 'unattested trees']) test(`stamp refuses success when calendars return ${variant}`, async () => {
  let requests = 0
  const { ots } = await library({ fetch: async (_url, init) => {
    requests++
    if (variant === 'only one accepts' && requests === 1) return pendingResponse(init)
    if (variant === 'unattested trees') return new Response(serializeTimestamp(new primitives.Timestamp(Array.from(init.body))))
    throw new Error('fixture outage')
  } })
  await assert.rejects(ots.stampHash('contract'), { code: 'OTS_CALENDAR_UNAVAILABLE' })
  assert.equal(requests, 4)
})
test('verification refuses malformed, oversize, altered and unattested proofs before HTTP', async () => {
  const { ots, calls } = await library()
  for (const proof of ['', 'not base64!', Buffer.alloc(64001).toString('base64'), 'bm90IGFuIG90cyBwcm9vZg==', proofFor('contract', null), proofFor('altered')]) {
    const result = await ots.verifyProof('contract', proof)
    assert.equal(result.verified, false); assert.notEqual(result.pending, true)
  }
  assert.equal(calls.length, 0)
})
test('verification checks Bitcoin height, block identity and Merkle root without claiming live anchoring', async () => {
  const data = 'fixture contract'; const hash = 'a'.repeat(64); const height = 123456; const timestamp = 1700000000
  const proof = proofFor(data, new primitives.Notary.BitcoinBlockHeaderAttestation(height))
  for (const bad of [null, 'merkle', 'height', 'id']) {
    const { ots, calls } = await library({ fetch: async url => url.pathname.includes('block-height') ? new Response(hash) : Response.json({
      id: bad === 'id' ? 'b'.repeat(64) : hash, height: bad === 'height' ? height + 1 : height,
      merkle_root: bad === 'merkle' ? '0'.repeat(64) : Buffer.from(digest(data)).reverse().toString('hex'), timestamp,
    }) })
    const result = await ots.verifyProof(data, proof)
    assert.equal(result.verified, bad === null)
    if (!bad) { assert.equal(result.blockHeight, height); assert.equal(result.timestamp.toISOString(), new Date(timestamp * 1000).toISOString()) }
    assert.equal(calls.length, 2)
  }
})
test('untrusted calendars and redirects cannot select an external verification destination', async () => {
  const { core, ots, calls } = await library()
  for (const value of ['http://a.pool.opentimestamps.org', 'https://a.pool.opentimestamps.org@evil.invalid', 'https://127.0.0.1', 'https://alice.btc.calendar.opentimestamps.org.evil.invalid', `${calendar}/path`, `${calendar}?secret=1`, `${calendar}:444`, `${calendar}\\evil`]) assert.throws(() => core.calendarOrigin(value))
  assert.equal((await ots.verifyProof('contract', proofFor('contract', new primitives.Notary.PendingAttestation('https://evil.invalid')))).verified, false)
  assert.equal(calls.length, 0)
  const redirect = await library({ fetch: async () => ({ redirected: true, body: { cancel: async () => {} } }) })
  await assert.rejects(redirect.core.readOtsResponse(new URL(`${calendar}/timestamp/aa`)), { code: 'OTS_REDIRECT_REJECTED' })
})
test('response streaming stops at its byte limit and cancels an oversized body', async () => {
  let cancelled = false
  const { core } = await library({ fetch: async () => new Response(new ReadableStream({ pull(controller) { controller.enqueue(new Uint8Array(6)) }, cancel() { cancelled = true } })) })
  await assert.rejects(core.readOtsResponse(new URL(`${calendar}/timestamp/aa`), undefined, 10), { code: 'OTS_RESPONSE_TOO_LARGE' })
  assert.equal(cancelled, true)
})
test('total timeout rejects an adapter ignoring AbortSignal and cancels its late response', async () => {
  let now = 0; let expire; let resolveFetch; let cancelled = false
  const { core, calls } = await library({ globals: { performance: { now: () => now }, setTimeout: fn => { expire = fn; return 1 }, clearTimeout() {} }, fetch: () => new Promise(resolve => { resolveFetch = resolve }) })
  const operation = core.readOtsResponse(new URL(`${calendar}/timestamp/aa`))
  const rejection = assert.rejects(operation, { code: 'OTS_TIMEOUT' })
  now = 10001; expire(); await rejection
  assert.equal(calls[0].init.signal.aborted, true)
  resolveFetch(new Response(new ReadableStream({ cancel() { cancelled = true } })))
  await new Promise(resolve => setImmediate(resolve)); assert.equal(cancelled, true)
})
test('same-major bn.js patch keeps endian/arithmetic behavior and fixes maskn(0)', () => {
  const bitcoreRequire = createRequire(upstreamRequire.resolve('bitcore-lib/package.json'))
  const BN = bitcoreRequire('bn.js')
  assert.equal(bitcoreRequire('bn.js/package.json').version, '4.12.5')
  assert.equal(new BN('abcdef', 16).maskn(0).toString(16), '0')
  assert.equal(new BN([1, 2, 3], 'le').toString(16), '30201')
  assert.equal(new BN('12345678901234567890').mul(new BN(123)).toString(10), '1518518504851851850470')
  assert.equal(new BN(10).mul(new BN(0)).toString(10), '0')
  assert.equal(new BN(25).divRound(new BN(4)).toString(10), '6')
})
test('proof paths never invoke ECDSA signing or load legacy request transport', async t => {
  const bitcoreRequire = createRequire(upstreamRequire.resolve('bitcore-lib/package.json'))
  const EC = bitcoreRequire('elliptic').ec
  const tripwire = t.mock.method(EC.prototype, 'sign', () => { throw new Error('ECDSA_SIGNING_FORBIDDEN') })
  assert.throws(() => EC.prototype.sign(), /ECDSA_SIGNING_FORBIDDEN/); tripwire.mock.resetCalls()
  const { ots } = await library(); const stamped = await ots.stampDocument('contract')
  assert.equal((await ots.verifyProof('contract', stamped.proofBase64)).pending, true)
  assert.equal((await ots.verifyProof('changed', stamped.proofBase64)).verified, false)
  assert.equal((await ots.verifyProof('contract', 'malformed')).verified, false)
  assert.equal(tripwire.mock.callCount(), 0)
  assert.equal(Object.keys(require.cache).filter(path => /\/node_modules\/(?:request|request-promise|request-promise-core|uuid)\//.test(path)).length, 0)
})
