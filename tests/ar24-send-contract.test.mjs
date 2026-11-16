import { test, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { submitAR24Qualified, prepareAR24Send } from '../src/lib/ar24-send-contract.ts'
import { requestAR24 } from '../src/lib/ar24-protocol.ts'
import { configured, encryptedResponse, qualifiedInput, acceptedDeposit } from './ar24-fixtures.mjs'

const previous = Object.fromEntries(Object.keys(configured).map(key => [key, process.env[key]]))
const originalFetch = globalThis.fetch
let calls
beforeEach(() => {
  Object.assign(process.env, configured); calls = []
  globalThis.fetch = async (...args) => {
    calls.push(args)
    return encryptedResponse(calls.length === 1 ? { file_id: '5490' } : acceptedDeposit(), ...args)
  }
})
afterEach(() => {
  globalThis.fetch = originalFetch
  for (const [key, value] of Object.entries(previous)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
})
const unconfirmed = error => error.code === 'ar24_unconfirmed'
test('qualified construction uploads PDF then sends one signed eIDAS /mail request', async () => {
  assert.deepEqual(await submitAR24Qualified(qualifiedInput(), requestAR24), { tracking_number: '123', cost_excluding_tax: 0, status: 'sent' })
  assert.equal(calls.length, 2)
  const [upload, mail] = calls
  assert.equal(new URL(upload[0]).pathname, '/api/attachment')
  assert.equal(upload[1].body.get('id_user'), '901')
  const file = upload[1].body.get('file')
  assert.equal(file.name, 'test.pdf'); assert.equal(file.type, 'application/pdf')
  assert.equal(await file.text(), '%PDF-synthetic-test-only')
  assert.equal(new URL(mail[0]).pathname, '/api/mail')
  assert.equal(mail[1].method, 'POST'); assert.equal(mail[1].redirect, 'error')
  for (const [field, value] of Object.entries({ id_user: '901', eidas: '1', to_firstname: 'Synthetic', to_lastname: 'Recipient',
    to_email: 'recipient@example.invalid', dest_statut: 'particulier', otp: '123456', 'attachment[0]': '5490',
    ref_dossier: 'case-synthetic', ref_client: 'document-synthetic', content: 'Synthetic &lt;text&gt;' })) assert.equal(mail[1].body.get(field), value)
  assert.equal(mail[1].body.get('auth_otp_hash'), null)
  assert.equal(mail[1].headers.Authorization, undefined); assert.ok(mail[1].headers.signature)
})
test('professional company and explicit OTP hash are preserved without guessing person names', () => {
  const input = qualifiedInput()
  input.sender.authentication = { hash: 'synthetic-hash' }
  input.recipient = { status: 'professionnel', company: 'Synthetic Ltd', email: 'recipient@example.invalid' }
  const { mail } = prepareAR24Send(input)
  assert.equal(mail.get('to_company'), 'Synthetic Ltd')
  assert.equal(mail.get('to_firstname'), null); assert.equal(mail.get('to_lastname'), null)
  assert.equal(mail.get('auth_otp_hash'), 'synthetic-hash'); assert.equal(mail.get('otp'), null)
})
test('missing sender, identity, recipient type/names/email, references or PDF are rejected before upload', async () => {
  const mutations = [input => delete input.sender, input => input.sender.id = 'app-user-uuid',
    input => input.sender.authentication = {}, input => input.sender.authentication = { otp: '123456', hash: 'both-invalid' },
    input => delete input.recipient.email, input => input.recipient.email = 'not email', input => delete input.recipient.status,
    input => delete input.recipient.firstName, input => input.recipient = { status: 'professionnel', email: 'r@example.invalid' },
    input => delete input.reference.documentId, input => input.documentPdfBuffer = Buffer.from('not pdf'),
    input => input.filename = '../test.pdf', input => input.documentPdfBuffer = Buffer.alloc(0)]
  for (const mutate of mutations) {
    const input = qualifiedInput(); mutate(input)
    await assert.rejects(submitAR24Qualified(input, requestAR24), error => error.code === 'ar24_unavailable')
  }
  assert.equal(calls.length, 0)
})
test('invalid upload reference prevents any mail creation', async () => {
  for (const file_id of [undefined, '', 'SIM-AR-old', '0', 'file-123']) {
    let count = 0
    await assert.rejects(submitAR24Qualified(qualifiedInput(), async () => { count++; return { file_id } }), unconfirmed)
    assert.equal(count, 1)
  }
})
test('drafts, unknown status, mismatched identities/attachment and invalid prices cannot establish deposit', async () => {
  for (const patch of [{ id: 'SIM-AR-123' }, { status: 'to_valid' }, { status: 'waiting' }, { status: 'unknown' },
    { is_eidas: false }, { send_fail: true }, { id_sender: 902 }, { to_email: 'other@example.invalid' },
    { ref_client: 'other-document' }, { ref_dossier: 'other-case' }, { attachments: [9999] },
    { price_ht: -1 }, { price_ht: '1.99' }, { price_ht: undefined }, { type: 'paper' }]) {
    let count = 0
    await assert.rejects(submitAR24Qualified(qualifiedInput(), async () => ++count === 1 ? { file_id: 5490 } : { ...acceptedDeposit(), ...patch }), unconfirmed)
    assert.equal(count, 2)
  }
})
test('mail transport uncertainty is not retried and reveals no provider body or credentials', async () => {
  globalThis.fetch = async (...args) => {
    calls.push(args)
    if (calls.length === 1) return encryptedResponse({ file_id: 5490 }, ...args)
    throw new Error('private recipient and synthetic token')
  }
  await assert.rejects(submitAR24Qualified(qualifiedInput(), requestAR24), error => unconfirmed(error) && !/private|token|recipient/.test(error.message))
  assert.equal(calls.length, 2)
})
