import { expect, test, type Page } from '@playwright/test'
import { build } from 'esbuild'

interface PendingRequest {
  url: string
  method: string
  body: BodyInit | null | undefined
  signal: AbortSignal | null | undefined
  resolve: (response: Response) => void
  reject: (reason: Error) => void
}

declare global {
  interface Window {
    jurisRequests: PendingRequest[]
  }
}

async function mount(page: Page, kind: 'payments' | 'users') {
  const { outputFiles } = await build({
    stdin: {
      contents: `import React from 'react';
        import { createRoot } from 'react-dom/client';
        import { Toaster } from 'sonner';
        import AdminPage from './src/app/(dashboard)/admin/${kind}/page';
        createRoot(document.getElementById('root')).render(<><AdminPage /><Toaster /></>);`,
      resolveDir: process.cwd(),
      loader: 'tsx',
    },
    bundle: true,
    write: false,
    jsx: 'automatic',
    define: { 'process.env.NODE_ENV': '"production"' },
  })
  const externalRequests: string[] = []
  await page.route('**/*', route => {
    externalRequests.push(route.request().url())
    return route.abort()
  })
  await page.setContent('<main id="root"></main>')
  await page.evaluate(() => {
    window.jurisRequests = []
    window.fetch = (input, init = {}) => new Promise<Response>((resolve, reject) => {
      window.jurisRequests.push({
        url: String(input), method: init.method ?? 'GET', body: init.body,
        signal: init.signal, resolve, reject,
      })
    })
  })
  await page.addScriptTag({ content: outputFiles[0].text })
  await expect.poll(() => page.evaluate(() => window.jurisRequests.length)).toBe(1)
  return externalRequests
}

async function respond(page: Page, index: number, body: Record<string, unknown>) {
  await page.evaluate(({ index, body }) => {
    window.jurisRequests[index].resolve(new Response(JSON.stringify(body), {
      status: 200, headers: { 'content-type': 'application/json' },
    }))
  }, { index, body })
}

const payment = (id: string) => ({
  id, user_id: 'fixture-user', stripe_payment_id: null, amount: 10,
  type: 'subscription', status: 'succeeded', created_at: '2026-01-01T12:00:00Z',
})
const user = (email: string) => ({
  id: 'fixture-user', email, full_name: 'Compte de test', phone: null,
  subscription_plan: 'free', stripe_customer_id: null,
  created_at: '2026-01-01T12:00:00Z', referral_code: null, role: 'user',
})

test('les paiements du filtre courant résistent à une ancienne réponse tardive', async ({ page }) => {
  const external = await mount(page, 'payments')
  await page.getByRole('combobox').first().selectOption('subscription')
  await expect.poll(() => page.evaluate(() => window.jurisRequests.length)).toBe(2)
  expect(await page.evaluate(() => window.jurisRequests[0].signal?.aborted)).toBe(true)

  await respond(page, 1, { payments: [payment('current')] })
  await expect(page.getByRole('cell', { name: 'current', exact: true })).toBeVisible()
  // The controlled transport deliberately ignores AbortSignal so the result guard is exercised too.
  await respond(page, 0, { payments: [payment('obsolete')] })
  await page.evaluate(() => new Promise<void>(resolve => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  }))
  await expect(page.getByRole('cell', { name: 'current', exact: true })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'obsolete', exact: true })).toBeHidden()
  expect(external).toEqual([])
})

test('une erreur réseau de lecture présente une explication française', async ({ page }) => {
  const external = await mount(page, 'payments')
  await page.evaluate(() => window.jurisRequests[0].reject(new TypeError('fixture offline')))
  await expect(page.getByText('Impossible de charger les paiements. Réessaie.', { exact: true })).toBeVisible()
  await expect(page.getByText('Chargement…', { exact: true })).toBeHidden()
  expect(external).toEqual([])
})

test('la fin d’un changement de plan recharge les filtres actuellement affichés', async ({ page }) => {
  const external = await mount(page, 'users')
  await respond(page, 0, { users: [user('initial@example.test')], total: 1 })
  const row = page.getByRole('row').filter({ hasText: 'initial@example.test' })
  await row.getByRole('combobox').selectOption('pro')
  await expect.poll(() => page.evaluate(() => window.jurisRequests.length)).toBe(2)
  expect(await page.evaluate(() => ({
    url: window.jurisRequests[1].url,
    method: window.jurisRequests[1].method,
    body: JSON.parse(String(window.jurisRequests[1].body)),
  }))).toEqual({
    url: '/api/admin/users', method: 'PATCH',
    body: { userId: 'fixture-user', subscription_plan: 'pro' },
  })

  await page.getByPlaceholder('Email ou nom…').fill('courant')
  await expect.poll(() => page.evaluate(() => window.jurisRequests.length)).toBe(3)
  await respond(page, 2, { users: [user('courant@example.test')], total: 1 })
  await expect(page.getByRole('cell', { name: 'courant@example.test', exact: true })).toBeVisible()
  await respond(page, 1, {})
  await expect.poll(() => page.evaluate(() => window.jurisRequests.length)).toBe(4)
  expect(await page.evaluate(() => window.jurisRequests[3].url)).toBe('/api/admin/users?q=courant&page=1')
  await respond(page, 3, { users: [user('courant@example.test')], total: 1 })
  await expect(page.getByRole('cell', { name: 'courant@example.test', exact: true })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'initial@example.test', exact: true })).toBeHidden()
  expect(external).toEqual([])
})
