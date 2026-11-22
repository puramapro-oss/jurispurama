import { beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { events, fixture, request } from './chat-route-harness.mjs'
const { POST } = await import('../src/app/api/ai/chat/route.ts')
let state
beforeEach(() => { state = fixture() })
const visible = result => result.filter(event => event.type === 'text').map(event => event.content).join('')
const stored = () => state.writes.find(write => write.payload.role === 'assistant')?.payload.content

for (const tag of ['juris-meta', 'JURIS-META', 'JuRiS-MeTa']) {
  test(`metadata tag ${tag} is hidden in streaming and storage even across one-character chunks`, async () => {
    state.providerChunks = [...`Réponse İ unicode.\n<${tag}>{"phase":"analyse","next_actions":["generate_document"]}</${tag}>`]
    const result = await events(await POST(request()))
    assert.equal(visible(result).trim(), 'Réponse İ unicode.')
    assert.equal(stored(), 'Réponse İ unicode.')
    assert.equal(result.at(-1).type, 'done')
    assert.deepEqual(result.at(-1).meta.next_actions, ['generate_document'])
  })
}

for (const suffix of ['<JURIS-META>{"phase":"analyse"', '<JURIS-ME', '<juris-meta>{bad-json}</juris-meta>', '<juris-meta>{"phase":"analyse"}</juris-meta><juris-meta>{"private":"not-visible"}</juris-meta>']) {
  test(`truncated or repeated metadata stays outside visible and persisted text: ${suffix}`, async () => {
    state.providerChunks = [...`Réponse valable.\n${suffix}`]
    const result = await events(await POST(request()))
    assert.equal(visible(result).trim(), 'Réponse valable.')
    assert.equal(stored(), 'Réponse valable.')
    assert.equal(result.at(-1).type, 'done')
  })
}

for (const chunks of [[], [''], [' \n\t '], ['<juris-meta>{"phase":"analyse"}</juris-meta>']]) {
  test(`empty public model output is not persisted or confirmed: ${JSON.stringify(chunks)}`, async () => {
    state.providerChunks = chunks
    const result = await events(await POST(request()))
    assert.equal(stored(), undefined)
    assert.equal(state.writes.some(write => write.op === 'update'), false)
    assert.equal(result.filter(event => event.type === 'error').length, 1)
    assert.equal(result.some(event => event.type === 'done'), false)
  })
}

test('a new case has no history to read and cannot fail because that unnecessary read is unavailable', async () => {
  state.historyError = { message: 'synthetic history read unavailable' }
  const response = await POST(request({ caseId: undefined }))
  const result = await events(response)
  assert.equal(response.status, 200)
  assert.equal(result[0].type, 'case_created')
  assert.equal(result.at(-1).type, 'done')
  assert.equal(state.queries.some(query => query.table === 'jurispurama_messages' && query.op === 'select'), false)
  assert.equal(state.writes.filter(write => write.table === 'jurispurama_cases' && write.op === 'insert').length, 1)
})
