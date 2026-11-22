import { beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { CASE_ID, events, fixture, historyRows, request } from './chat-route-harness.mjs'

const { POST } = await import('../src/app/api/ai/chat/route.ts')
let state
beforeEach(() => { state = fixture() })
const messageContents = () => state.providerCalls[0].messages.map(message => message.content)

for (const [count, firstExpected] of [[0, 0], [1, 0], [39, 0], [40, 2], [81, 42]]) {
  test(`context includes the latest prior turns and current request for ${count} stored messages`, async () => {
    const rows = historyRows(count)
    state = fixture(rows)
    const response = await POST(request())
    assert.equal(response.status, 200)
    const result = await events(response)
    assert.deepEqual(messageContents(), [...rows.slice(firstExpected).map(row => row.content), 'demande-courante'])
    assert.equal(state.providerCalls[0].messages[0].role, 'user')
    assert.equal(state.providerCalls[0].messages.at(-1).role, 'user')
    assert.equal(state.providerCalls[0].messages.length <= 40, true)
    assert.equal(result.filter(event => event.type === 'done').length, 1)
    assert.equal(state.writes.filter(write => write.payload.role === 'user').length, 1)
  })
}

test('a truncated context discards its orphan assistant prefix before calling the provider', async () => {
  const rows = historyRows(40)
  state = fixture(rows)
  await events(await POST(request()))
  assert.equal(state.providerCalls[0].messages[0].role, 'user')
  assert.deepEqual(messageContents(), [...rows.slice(2).map(row => row.content), 'demande-courante'])
})

test('an assistant-only historical prefix never becomes a fabricated user turn', async () => {
  state = fixture(historyRows(44).map(row => ({ ...row, role: 'assistant' })))
  await events(await POST(request()))
  assert.deepEqual(state.providerCalls[0].messages, [{ role: 'user', content: 'demande-courante' }])
})

test('timestamps tied across old messages still produce deterministic chronological context', async () => {
  const rows = historyRows(55, { tied: true })
  state = fixture([...rows].reverse())
  await events(await POST(request()))
  assert.deepEqual(messageContents(), [...rows.slice(-39).map(row => row.content), 'demande-courante'])
})

test('current images belong only to the current request after a long history', async () => {
  state = fixture(historyRows(81))
  const image = { data: 'dGVzdA==', media_type: 'image/png', name: 'fixture.png' }
  await events(await POST(request({ attachments: [image] })))
  const sent = state.providerCalls[0].messages
  assert.equal(sent.at(-1).content, 'demande-courante')
  assert.deepEqual(sent.at(-1).images, [{ data: image.data, media_type: image.media_type }])
  assert.equal(sent.slice(0, -1).some(message => message.images !== undefined), false)
})

test('same text in an old turn does not replace or duplicate the current request', async () => {
  const rows = historyRows(40)
  rows[39].content = 'demande-courante'
  state = fixture(rows)
  await events(await POST(request()))
  assert.equal(messageContents().filter(text => text === 'demande-courante').length, 2)
  assert.equal(state.providerCalls[0].messages.at(-1).role, 'user')
})

test('nonconversation roles do not consume the bounded history window', async () => {
  const rows = historyRows(50)
  const nonconversation = historyRows(60).map((row, i) => ({ ...row, id: `system-${i}`, role: 'system', content: `system-${i}`, created_at: '2026-01-10T00:00:00.000Z' }))
  state = fixture([...rows, ...nonconversation])
  await events(await POST(request()))
  assert.deepEqual(messageContents(), [...rows.slice(12).map(row => row.content), 'demande-courante'])
})

for (const missing of [false, true]) {
  test(`unavailable history (${missing ? 'missing data' : 'database error'}) stops before user persistence or provider`, async () => {
    state.historyMissing = missing
    state.historyError = missing ? null : { message: 'private-database-detail' }
    const response = await POST(request())
    assert.equal(response.status, 503)
    assert.doesNotMatch(await response.text(), /private-database-detail/)
    assert.deepEqual(state.providerCalls, [])
    assert.deepEqual(state.writes, [])
  })
}

for (const missing of [false, true]) {
  test(`unconfirmed user persistence (${missing ? 'missing receipt' : 'database error'}) never calls model`, async () => {
    state.userReceiptMissing = missing
    state.userInsertError = missing ? null : { message: 'private-database-detail' }
    const response = await POST(request())
    assert.equal(response.status, 500)
    assert.doesNotMatch(await response.text(), /private-database-detail/)
    assert.deepEqual(state.providerCalls, [])
  })
}

for (const missing of [false, true]) {
  test(`unconfirmed assistant persistence (${missing ? 'missing receipt' : 'database error'}) yields error without done`, async () => {
    state.assistantReceiptMissing = missing
    state.assistantInsertError = missing ? null : { message: 'private-database-detail' }
    const result = await events(await POST(request()))
    assert.equal(result.some(event => event.type === 'done'), false)
    assert.equal(result.filter(event => event.type === 'error').length, 1)
    assert.doesNotMatch(JSON.stringify(result), /private-database-detail/)
    assert.equal(state.writes.filter(write => write.payload.role === 'assistant').length, 1)
  })
}

for (const missing of [false, true]) {
  test(`unconfirmed case metadata (${missing ? 'missing receipt' : 'database error'}) yields error without done`, async () => {
    state.metadataReceiptMissing = missing
    state.metadataError = missing ? null : { message: 'private-database-detail' }
    state.providerChunks = ['Réponse.\n<juris-meta>{"phase":"analyse","next_actions":["generate_document"]}</juris-meta>']
    const result = await events(await POST(request()))
    assert.equal(result.some(event => event.type === 'done'), false)
    assert.equal(result.filter(event => event.type === 'error').length, 1)
    assert.doesNotMatch(JSON.stringify(result), /private-database-detail/)
  })
}

test('new case confirmation and metadata keep the existing SSE contract', async () => {
  state.providerChunks = ['Réponse.\n<juris-meta>{"phase":"analyse","next_actions":["generate_document"]}</juris-meta>']
  const result = await events(await POST(request({ caseId: undefined })))
  assert.equal(result[0].type, 'case_created')
  assert.equal(result[0].caseId, CASE_ID)
  assert.equal(result.at(-1).type, 'done')
  assert.equal(result.at(-1).caseId, CASE_ID)
  assert.deepEqual(result.at(-1).meta.next_actions, ['generate_document'])
  assert.equal(result.some(event => event.type === 'text' && event.content.includes('juris-meta')), false)
})

test('auth error with a populated user remains a denial before database or provider', async () => {
  state.authError = { message: 'unverified-user' }
  const response = await POST(request())
  assert.equal(response.status, 401)
  assert.deepEqual(state.queries, [])
  assert.deepEqual(state.providerCalls, [])
})

test('unowned case remains unavailable without message writes or model work', async () => {
  state.caseFound = false
  const response = await POST(request())
  assert.equal(response.status, 404)
  assert.deepEqual(state.writes, [])
  assert.deepEqual(state.providerCalls, [])
})

test('missing new-case identity cannot continue to message persistence or the model', async () => {
  state.caseCreationReceiptMissing = true
  const response = await POST(request({ caseId: undefined }))
  assert.equal(response.status, 500)
  assert.equal(state.writes.some(write => write.table === 'jurispurama_messages'), false)
  assert.deepEqual(state.providerCalls, [])
})

test('model failure exposes no provider message or false completion', async () => {
  state.providerError = 'private-provider-detail token=synthetic-secret'
  const result = await events(await POST(request()))
  assert.equal(result.some(event => event.type === 'done'), false)
  assert.equal(result.filter(event => event.type === 'error').length, 1)
  assert.doesNotMatch(JSON.stringify(result), /private-provider-detail|synthetic-secret/)
  assert.equal(state.writes.some(write => write.payload.role === 'assistant'), false)
})

for (const missing of [false, true]) {
  test(`a newly created case survives an unconfirmed first message (${missing ? 'missing receipt' : 'database error'}) and an explicit retry`, async () => {
    state.userReceiptMissing = missing
    state.userInsertError = missing ? null : { message: 'private-database-detail' }
    const failed = await POST(request({ caseId: undefined }))
    assert.equal(failed.status, 500)
    const body = await failed.json()
    assert.equal(body.caseId, CASE_ID)
    assert.match(body.error, /n’a pas été confirmé/)
    assert.doesNotMatch(body.error, /private-database-detail/)
    assert.deepEqual(state.providerCalls, [])
    assert.equal(state.writes.filter(write => write.table === 'jurispurama_cases').length, 1)

    state.userReceiptMissing = false
    state.userInsertError = null
    const retried = await POST(request({ caseId: body.caseId }))
    assert.equal(retried.status, 200)
    const completed = await events(retried)
    assert.equal(completed.at(-1).type, 'done')
    assert.equal(completed.at(-1).caseId, CASE_ID)
    assert.equal(state.writes.filter(write => write.table === 'jurispurama_cases').length, 1)
    assert.equal(state.providerCalls.length, 1)
    assert.equal(state.rows.filter(row => row.role === 'user').length, 1)
  })
}

test('an existing case failure never advertises a replacement conversation', async () => {
  state.userInsertError = { message: 'private-database-detail' }
  const response = await POST(request())
  assert.equal(response.status, 500)
  assert.equal('caseId' in await response.json(), false)
  assert.equal(state.writes.some(write => write.table === 'jurispurama_cases'), false)
})

for (const value of ['not-a-uuid', '/chat/elsewhere', 42]) {
  test(`an invalid created case identity ${JSON.stringify(value)} cannot be returned or reused`, async () => {
    state.createdCaseId = value
    const response = await POST(request({ caseId: undefined }))
    assert.equal(response.status, 500)
    assert.equal('caseId' in await response.json(), false)
    assert.equal(state.writes.some(write => write.table === 'jurispurama_messages'), false)
    assert.deepEqual(state.providerCalls, [])
  })
}
