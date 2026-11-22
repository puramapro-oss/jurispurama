import { expect, type Page } from '@playwright/test'
import { build } from 'esbuild'
import type { ChatStreamEvent } from '../src/lib/chat-stream'
import type {} from './fixtures/chat-stream'

export async function mountChat(page: Page, draft?: unknown, initialCase = 'new') {
  const { outputFiles } = await build({
    entryPoints: ['tests/fixtures/chat-stream.tsx'], bundle: true, write: false,
    jsx: 'automatic', define: { 'process.env.NODE_ENV': '"development"' },
  })
  const external: string[] = [], errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.route('**/*', route => {
    if (route.request().isNavigationRequest() && route.request().url().startsWith('https://chat-fixture.invalid/')) {
      return route.fulfill({ contentType: 'text/html', body: '<!doctype html><html lang="fr"><body><main id="root"></main></body></html>' })
    }
    external.push(route.request().url())
    return route.abort()
  })
  await page.goto(`https://chat-fixture.invalid/chat/${initialCase}`)
  await page.evaluate(({ draft, initialCase }) => {
    window.chatInitialCase = initialCase
    window.chatRequests = []; window.chatStreamControllers = {}; window.chatCancellations = {}; window.chatJSONReleases = {}
    if (draft) sessionStorage.setItem('jurispurama:pending_message', JSON.stringify({ message: draft, ts: Date.now() }))
    window.fetch = (input, options = {}) => new Promise<Response>((resolve, reject) => {
      // Deliberately ignore abort in the transport so late-result guards are exercised.
      window.chatRequests.push({ url: String(input), options, resolve, reject })
    })
  }, { draft, initialCase })
  await page.addScriptTag({ content: outputFiles[0].text })
  await expect(page.getByRole('region', { name: 'Conversation de test' })).toBeVisible()
  return { external, errors }
}

export async function requests(page: Page, count: number) {
  await expect.poll(() => page.evaluate(() => window.chatRequests.length)).toBe(count)
}

export async function sendQuestion(page: Page) {
  await page.getByRole('textbox', { name: 'Message à JurisIA' }).fill('Question de test')
  await page.getByRole('button', { name: 'Envoyer à JurisIA' }).click()
}

export async function replyStream(page: Page, index: number, events: ChatStreamEvent[], close = true) {
  await page.evaluate(({ index, events, close }) => {
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        window.chatStreamControllers[index] = controller
        for (const event of events) controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`))
        if (close) controller.close()
      },
      cancel() { window.chatCancellations[index] = (window.chatCancellations[index] ?? 0) + 1 },
    })
    window.chatRequests[index].resolve(new Response(body, { headers: { 'content-type': 'text/event-stream' } }))
  }, { index, events, close })
}

export async function replyCase(page: Page, index: number, id: string, content = '') {
  await page.evaluate(({ index, id, content }) => {
    window.chatRequests[index].resolve(new Response(JSON.stringify({
      case: { id, summary: `Dossier ${id}`, status: 'diagnostic' }, documents: [],
      messages: content ? [{ id: `message-${id}`, role: 'assistant', content, created_at: '2026-11-22T00:00:00Z' }] : [],
    }), { headers: { 'content-type': 'application/json' } }))
  }, { index, id, content })
}

export async function settleUI(page: Page) {
  await page.evaluate(() => new Promise<void>(resolve => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  }))
}
