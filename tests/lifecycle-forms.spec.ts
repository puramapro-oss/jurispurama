import { expect, test, type Page } from '@playwright/test'
import { build } from 'esbuild'

interface LifecycleRequest {
  url: string
  method: string
  body: BodyInit | null | undefined
  signal: AbortSignal | null | undefined
  resolve: (response: Response) => void
}

declare global {
  interface Window {
    lifecycleRequests: LifecycleRequest[]
    releasedPreviews: string[]
    chatStream: ReadableStreamDefaultController<Uint8Array>
    chatStreamCancelled: boolean
  }
}

async function mount(page: Page, fixture: 'GenerateFixture' | 'SendFixture' | 'ScanFixture' | 'ChatFixture') {
  const { outputFiles } = await build({
    stdin: {
      contents: `import React from 'react'; import { createRoot } from 'react-dom/client';
        import { ${fixture} } from './tests/fixtures/lifecycle-forms';
        createRoot(document.getElementById('root')).render(<${fixture} />);`,
      resolveDir: process.cwd(), loader: 'tsx',
    },
    bundle: true, write: false, jsx: 'automatic',
    define: { 'process.env.NODE_ENV': '"production"' },
  })
  const external: string[] = []
  await page.route('**/*', route => { external.push(route.request().url()); return route.abort() })
  if (fixture === 'ChatFixture') {
    await page.route('https://juris.fixture.invalid/', route => route.fulfill({ contentType: 'text/html', body: '<main id="root"></main>' }))
    await page.goto('https://juris.fixture.invalid/')
    await page.unroute('https://juris.fixture.invalid/')
  } else {
    await page.setContent('<main id="root"></main>')
  }
  await page.evaluate(() => {
    window.lifecycleRequests = []
    window.releasedPreviews = []
    window.chatStreamCancelled = false
    const revoke = URL.revokeObjectURL.bind(URL)
    URL.revokeObjectURL = url => { window.releasedPreviews.push(url); revoke(url) }
    window.fetch = (input, options = {}) => new Promise<Response>(resolve => {
      window.lifecycleRequests.push({ url: String(input), method: options.method ?? 'GET', body: options.body, signal: options.signal, resolve })
    })
  })
  await page.addScriptTag({ content: outputFiles[0].text })
  return external
}

async function respond(page: Page, index: number, body: unknown) {
  await page.evaluate(({ index, body }) => window.lifecycleRequests[index].resolve(new Response(JSON.stringify(body), {
    status: 200, headers: { 'content-type': 'application/json' },
  })), { index, body })
}

test('génération : conserve le brouillon pendant une actualisation et le renouvelle à l’ouverture ou au changement de dossier', async ({ page }) => {
  const external = await mount(page, 'GenerateFixture')
  const title = page.getByLabel('Titre du document'), instructions = page.getByLabel('Précisions (optionnel)')
  await title.fill('Mon titre')
  await instructions.fill('Mes précisions')
  await page.getByRole('button', { name: 'Actualiser 0', exact: true }).click()
  await expect(title).toHaveValue('Mon titre')
  await expect(instructions).toHaveValue('Mes précisions')
  await page.getByRole('button', { name: 'Fermer', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeHidden()
  await page.getByRole('button', { name: 'Ouvrir', exact: true }).click()
  await expect(title).toHaveValue('Dossier amende')
  await expect(instructions).toHaveValue('')
  await instructions.fill('À effacer au changement')
  await page.getByRole('button', { name: 'Changer de dossier', exact: true }).click()
  await expect(title).toHaveValue('Dossier travail')
  await expect(page.getByLabel('Type de document')).toHaveValue('requete-prudhommes')
  await expect(instructions).toHaveValue('')
  expect(await page.evaluate(() => window.lifecycleRequests.length)).toBe(0)
  expect(external).toEqual([])
})

test('envoi : conserve le destinataire mais renouvelle l’objet à l’ouverture et au changement de titre', async ({ page }) => {
  const external = await mount(page, 'SendFixture')
  await page.getByLabel('Nom du destinataire').fill('Destinataire de test')
  await page.getByLabel('Email du destinataire').fill('test@example.test')
  await page.getByLabel('Objet', { exact: true }).fill('Objet personnalisé')
  await page.getByLabel('Message (facultatif)').fill('Brouillon à conserver')
  await page.getByRole('button', { name: 'Actualiser 0', exact: true }).click()
  await expect(page.getByLabel('Objet', { exact: true })).toHaveValue('Objet personnalisé')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toBeHidden()
  await page.getByRole('button', { name: 'Ouvrir', exact: true }).click()
  await expect(page.getByLabel('Objet', { exact: true })).toHaveValue('Document juridique — Document A')
  await expect(page.getByLabel('Nom du destinataire')).toHaveValue('Destinataire de test')
  await expect(page.getByLabel('Message (facultatif)')).toHaveValue('Brouillon à conserver')
  await page.getByRole('button', { name: 'Changer de titre', exact: true }).click()
  await expect(page.getByLabel('Objet', { exact: true })).toHaveValue('Document juridique — Document B')
  await page.getByRole('button', { name: "Envoyer l'email", exact: true }).click()
  await expect.poll(() => page.evaluate(() => window.lifecycleRequests.length)).toBe(1)
  expect(await page.evaluate(() => ({ url: window.lifecycleRequests[0].url,
    method: window.lifecycleRequests[0].method, body: JSON.parse(String(window.lifecycleRequests[0].body)) }))).toEqual({
    url: '/api/documents/fixture-document/send-email', method: 'POST',
    body: { recipientName: 'Destinataire de test', recipientEmail: 'test@example.test',
      subject: 'Document juridique — Document B', bodyMessage: 'Brouillon à conserver' },
  })
  await respond(page, 0, {})
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(page.getByTestId('sent-count')).toHaveText('1')
  expect(external).toEqual([])
})

test('scanner : change et libère l’aperçu, redémarre les étapes et nettoie à la fermeture', async ({ page }) => {
  await page.clock.install()
  const external = await mount(page, 'ScanFixture')
  const file = page.getByLabel('Document à analyser')
  await file.setInputFiles({ name: 'fixture.png', mimeType: 'image/png', buffer: Buffer.from('fixture') })
  const preview = await page.getByTestId('scan-preview').textContent()
  expect(preview).toMatch(/^blob:/)
  await file.setInputFiles({ name: 'fixture.pdf', mimeType: 'application/pdf', buffer: Buffer.from('fixture') })
  await expect(page.getByTestId('scan-preview')).toHaveText('aucun aperçu')
  expect(await page.evaluate(() => window.releasedPreviews)).toEqual([preview])
  await page.getByRole('button', { name: 'Analyser', exact: true }).click()
  await expect(page.getByTestId('scan-running')).toHaveText('true')
  await expect(page.getByTestId('scan-step')).toHaveText('Lecture du document…')
  await page.clock.fastForward(1800)
  await expect(page.getByTestId('scan-step')).toHaveText('Identification du type…')
  await respond(page, 0, { summary: 'Analyse synthétique' })
  await expect(page.getByTestId('scan-running')).toHaveText('false')
  await expect(page.getByTestId('scan-step')).toHaveText('Lecture du document…')
  await page.getByRole('button', { name: 'Analyser', exact: true }).click()
  await expect(page.getByTestId('scan-step')).toHaveText('Lecture du document…')
  await respond(page, 1, { summary: 'Seconde analyse synthétique' })
  await expect(page.getByTestId('scan-running')).toHaveText('false')
  await file.setInputFiles({ name: 'second.png', mimeType: 'image/png', buffer: Buffer.from('fixture') })
  const second = await page.getByTestId('scan-preview').textContent()
  await page.getByRole('button', { name: 'Quitter le scanner', exact: true }).click()
  await expect(page.getByText('Scanner fermé', { exact: true })).toBeVisible()
  expect(await page.evaluate(() => window.releasedPreviews)).toEqual([preview, second])
  expect(external).toEqual([])
})

test('nouveau chat : aucun chargement persistant et aucune réponse obsolète après changement de route', async ({ page }) => {
  const external = await mount(page, 'ChatFixture')
  await expect(page.getByTestId('chat-loading')).toHaveText('true')
  await expect.poll(() => page.evaluate(() => window.lifecycleRequests.length)).toBe(1)
  await page.getByRole('button', { name: 'Nouveau dossier', exact: true }).click()
  await expect(page.getByTestId('chat-loading')).toHaveText('false')
  await expect(page.getByTestId('chat-id')).toHaveText('nouveau')
  expect(await page.evaluate(() => window.lifecycleRequests[0].signal?.aborted)).toBe(true)
  await respond(page, 0, { case: { id: 'obsolete' }, messages: [{ id: 'obsolete', role: 'user', content: 'Ancien dossier' }] })
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
  await expect(page.getByTestId('chat-messages')).toHaveText('[]')
  expect(await page.evaluate(() => window.lifecycleRequests.length)).toBe(1)
  expect(external).toEqual([])
})

test('scanner : réinitialiser pendant l’analyse empêche son résultat tardif de réapparaître', async ({ page }) => {
  const external = await mount(page, 'ScanFixture')
  await page.getByLabel('Document à analyser').setInputFiles({ name: 'fixture.pdf', mimeType: 'application/pdf', buffer: Buffer.from('fixture') })
  await page.getByRole('button', { name: 'Analyser', exact: true }).click()
  await expect(page.getByTestId('scan-running')).toHaveText('true')
  await page.getByRole('button', { name: 'Réinitialiser', exact: true }).click()
  await expect(page.getByTestId('scan-running')).toHaveText('false')
  expect(await page.evaluate(() => window.lifecycleRequests[0].signal?.aborted)).toBe(true)
  await respond(page, 0, { summary: 'Ancien résultat à ignorer' })
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
  await expect(page.getByTestId('scan-result')).toHaveText('')
  expect(external).toEqual([])
})

test('chat : un dossier chargé devient un nouveau dossier sans réutiliser son ID et adopte ensuite le dossier créé', async ({ page }) => {
  const external = await mount(page, 'ChatFixture')
  await expect.poll(() => page.evaluate(() => window.lifecycleRequests.length)).toBe(1)
  await respond(page, 0, { case: { id: 'existing-fixture' }, documents: [{ id: 'old-document' }],
    messages: [{ id: 'old-message', role: 'user', content: 'Ancien dossier' }] })
  await expect(page.getByTestId('chat-messages')).toContainText('Ancien dossier')
  await page.getByRole('button', { name: 'Nouveau dossier', exact: true }).click()
  await expect(page.getByTestId('chat-id')).toHaveText('nouveau')
  await expect(page.getByTestId('chat-case')).toHaveText('null')
  await expect(page.getByTestId('chat-documents')).toHaveText('[]')
  await expect(page.getByTestId('chat-messages')).toHaveText('[]')
  await page.getByRole('button', { name: 'Envoyer le message', exact: true }).click()
  await expect.poll(() => page.evaluate(() => window.lifecycleRequests.length)).toBe(2)
  expect(await page.evaluate(() => ({ url: window.lifecycleRequests[1].url,
    method: window.lifecycleRequests[1].method, body: JSON.parse(String(window.lifecycleRequests[1].body)) }))).toEqual({
    url: '/api/ai/chat', method: 'POST', body: { message: 'Message synthétique' },
  })
  await page.evaluate(() => {
    const body = new ReadableStream<Uint8Array>({ start(controller) { window.chatStream = controller } })
    window.lifecycleRequests[1].resolve(new Response(body, { headers: { 'content-type': 'text/event-stream' } }))
    window.chatStream.enqueue(new TextEncoder().encode('data: {"type":"case_created","caseId":"created-fixture"}\n\n'))
  })
  await expect(page.getByTestId('chat-id')).toHaveText('created-fixture')
  await page.getByRole('button', { name: 'Suivre le dossier créé', exact: true }).click()
  expect(await page.evaluate(() => window.lifecycleRequests[1].signal?.aborted)).toBe(false)
  expect(await page.evaluate(() => window.lifecycleRequests.length)).toBe(2)
  await page.evaluate(() => {
    const events = [
      { type: 'text', content: 'Réponse synthétique' },
      { type: 'done', caseId: 'created-fixture', meta: { next_actions: ['generate_document'] } },
    ].map(event => `data: ${JSON.stringify(event)}\n\n`).join('')
    window.chatStream.enqueue(new TextEncoder().encode(events))
    window.chatStream.close()
  })
  await expect.poll(() => page.evaluate(() => window.lifecycleRequests.length)).toBe(3)
  await respond(page, 2, { case: { id: 'created-fixture' }, documents: [] })
  await expect(page.getByTestId('chat-streaming')).toHaveText('false')
  await expect(page.getByTestId('chat-id')).toHaveText('created-fixture')
  expect(new URL(page.url()).pathname).toBe('/chat/created-fixture')
  await expect(page.getByTestId('chat-messages')).toContainText('Réponse synthétique')
  await expect(page.getByTestId('chat-messages')).toContainText('generate_document')
  expect(await page.evaluate(() => window.lifecycleRequests.length)).toBe(3)
  expect(external).toEqual([])
})

test('chat : quitter une conversation en streaming ignore ses événements tardifs', async ({ page }) => {
  const external = await mount(page, 'ChatFixture')
  await expect.poll(() => page.evaluate(() => window.lifecycleRequests.length)).toBe(1)
  await respond(page, 0, { case: { id: 'existing-fixture' }, messages: [] })
  await expect(page.getByTestId('chat-loading')).toHaveText('false')
  await page.getByRole('button', { name: 'Envoyer le message', exact: true }).click()
  await expect.poll(() => page.evaluate(() => window.lifecycleRequests.length)).toBe(2)
  await page.evaluate(() => {
    const body = new ReadableStream<Uint8Array>({
      start(controller) { window.chatStream = controller },
      cancel() { window.chatStreamCancelled = true },
    })
    window.lifecycleRequests[1].resolve(new Response(body, { headers: { 'content-type': 'text/event-stream' } }))
  })
  await page.getByRole('button', { name: 'Nouveau dossier', exact: true }).click()
  await expect(page.getByTestId('chat-messages')).toHaveText('[]')
  await expect(page.getByTestId('chat-streaming')).toHaveText('false')
  expect(await page.evaluate(() => window.lifecycleRequests[1].signal?.aborted)).toBe(true)
  expect(await page.evaluate(() => window.chatStreamCancelled)).toBe(true)
  expect(await page.evaluate(() => {
    try {
      window.chatStream.enqueue(new TextEncoder().encode('data: {"type":"case_created","caseId":"obsolete"}\n\n'))
      return false
    } catch (error) { return error instanceof TypeError }
  })).toBe(true)
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
  await expect(page.getByTestId('chat-id')).toHaveText('nouveau')
  await expect(page.getByTestId('chat-messages')).toHaveText('[]')
  expect(await page.evaluate(() => window.lifecycleRequests.length)).toBe(2)
  expect(external).toEqual([])
})

for (const adoptDuringStream of [true, false]) {
  test(`chat : un refresh 503 relance le dossier, adoption pendant le flux = ${adoptDuringStream}`, async ({ page }) => {
    const external = await mount(page, 'ChatFixture')
    await expect.poll(() => page.evaluate(() => window.lifecycleRequests.length)).toBe(1)
    await respond(page, 0, { case: { id: 'existing-fixture' }, messages: [] })
    await expect(page.getByTestId('chat-loading')).toHaveText('false')
    await page.getByRole('button', { name: 'Nouveau dossier', exact: true }).click()
    await page.getByRole('button', { name: 'Envoyer le message', exact: true }).click()
    await expect.poll(() => page.evaluate(() => window.lifecycleRequests.length)).toBe(2)
    await page.evaluate(() => {
      const events = [
        { type: 'case_created', caseId: 'created-fixture' },
        { type: 'text', content: 'Réponse synthétique' },
        { type: 'done', caseId: 'created-fixture' },
      ].map(event => `data: ${JSON.stringify(event)}\n\n`).join('')
      window.lifecycleRequests[1].resolve(new Response(events, { headers: { 'content-type': 'text/event-stream' } }))
    })
    await expect.poll(() => page.evaluate(() => window.lifecycleRequests.length)).toBe(3)
    if (adoptDuringStream) await page.getByRole('button', { name: 'Suivre le dossier créé', exact: true }).click()
    expect(await page.evaluate(() => window.lifecycleRequests.length)).toBe(3)
    await page.evaluate(() => window.lifecycleRequests[2].resolve(new Response('{}', { status: 503 })))
    await expect.poll(() => page.evaluate(() => window.lifecycleRequests.length)).toBe(4)
    expect(await page.evaluate(() => window.lifecycleRequests[3].url)).toBe('/api/cases/created-fixture')
    await respond(page, 3, { case: { id: 'created-fixture' }, documents: [{ id: 'fresh-document' }],
      messages: [{ id: 'fresh-message', role: 'assistant', content: 'Réponse persistée' }] })
    await expect(page.getByTestId('chat-case')).toContainText('created-fixture')
    await expect(page.getByTestId('chat-documents')).toContainText('fresh-document')
    await expect(page.getByTestId('chat-messages')).toContainText('Réponse persistée')
    await expect(page.getByTestId('chat-streaming')).toHaveText('false')
    if (!adoptDuringStream) {
      await page.getByRole('button', { name: 'Suivre le dossier créé', exact: true }).click()
      expect(await page.evaluate(() => window.lifecycleRequests.length)).toBe(4)
    }
    expect(external).toEqual([])
  })
}
