import test from 'node:test'
import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
import { qualifiedInput, acceptedDeposit } from './ar24-fixtures.mjs'

// Independent review regressions. The override allows replay against a pinned prior module.
const source = process.env.AR24_SEND_CONTRACT_PATH
  ? pathToFileURL(process.env.AR24_SEND_CONTRACT_PATH).href
  : new URL('../src/lib/ar24-send-contract.ts', import.meta.url).href
const { submitAR24Qualified } = await import(source)
async function rejectResult(patch, input = qualifiedInput()) {
  let calls = 0
  await assert.rejects(submitAR24Qualified(input, async () => ++calls === 1
    ? { file_id: 5490 } : { ...acceptedDeposit(), ...patch }),
  error => error.code === 'ar24_unconfirmed' && error.status === 502)
  assert.equal(calls, 2, 'an inconsistent result must never trigger another send')
}

test('review regression: status must be a primitive string, without coercion', async () => {
  for (const status of [['sent'], ['AR'], { toString: () => 'sent' }, new String('sent'), null, 1, true]) {
    await rejectResult({ status })
  }
})

test('runtime numeric sender ID is rejected before uploading or creating any mail', async () => {
  const input = qualifiedInput()
  input.sender.id = 901
  let calls = 0
  await assert.rejects(submitAR24Qualified(input, async () => { calls++; return acceptedDeposit() }),
    error => error.code === 'ar24_unavailable')
  assert.equal(calls, 0)
})

test('review regression: recipient status must match the submitted status in both directions', async () => {
  for (const dest_statut of ['professionnel', undefined, null, ['particulier'], {}]) {
    await rejectResult({ dest_statut, to_company: 'Different Corporation' })
  }
  const professional = qualifiedInput()
  professional.recipient = { status: 'professionnel', email: 'recipient@example.invalid', company: 'Synthetic Ltd' }
  await rejectResult({ dest_statut: 'particulier' }, professional)
})

test('review regression: attachments must contain exactly the uploaded file, once', async () => {
  for (const attachments of [[5490, 9999], [5490, 5490], ['5490', 5490], [5490, null],
    [5490, 'invalid'], [9999], [], undefined, '5490', { 0: 5490, length: 1 }]) {
    await rejectResult({ attachments })
  }
})

test('verified recipient name replacement and canonical attachment IDs remain accepted', async () => {
  for (const recipientStatus of ['particulier', 'professionnel']) {
    const input = qualifiedInput()
    if (recipientStatus === 'professionnel') input.recipient = {
      status: recipientStatus, email: 'recipient@example.invalid', company: 'Synthetic Ltd',
    }
    for (const attachmentId of [5490, '5490']) {
      let calls = 0
      const result = await submitAR24Qualified(input, async () => ++calls === 1 ? { file_id: '5490' }
        : { ...acceptedDeposit(), dest_statut: recipientStatus, to_company: 'Synthetic Ltd',
          to_firstname: 'Verified Firstname', to_lastname: 'Verified Lastname', attachments: [attachmentId] })
      assert.deepEqual(result, { tracking_number: '123', cost_excluding_tax: 0, status: 'sent' })
      assert.equal(calls, 2)
    }
  }
})
