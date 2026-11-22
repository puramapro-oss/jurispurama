import { expect, test } from '@playwright/test'
import { build } from 'esbuild'

declare global {
  interface Window {
    subscriptionRead: { url: string; signal?: AbortSignal | null }
  }
}

test('l’âge de l’abonnement suit le temps et le retour sur la page sans nouvelle requête', async ({ page }) => {
  const start = Date.UTC(2026, 10, 22)
  await page.clock.install({ time: start })
  const { outputFiles } = await build({
    stdin: {
      contents: `import React, { useState } from 'react'; import { createRoot } from 'react-dom/client';
        import Settings from './src/app/(dashboard)/settings/abonnement/page';
        function Fixture() { const [open, setOpen] = useState(true);
          return <><button onClick={() => setOpen(false)}>Quitter</button>{open ? <Settings /> : <p>Fermé</p>}</>; }
        createRoot(document.getElementById('root')).render(<Fixture />);`,
      resolveDir: process.cwd(), loader: 'tsx',
    },
    bundle: true, write: false, jsx: 'automatic',
    define: { 'process.env.NODE_ENV': '"production"' },
    // Authentication is outside this clock regression; the real settings page and children are bundled.
    plugins: [{ name: 'auth-fixture', setup(build) {
      build.onResolve({ filter: /\/hooks\/useAuth$/ }, () => ({ path: 'auth-fixture', namespace: 'fixture' }))
      build.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: 'export const useAuth = () => ({ profile: null });' }))
    } }],
  })
  const external: string[] = []
  await page.route('**/*', route => { external.push(route.request().url()); return route.abort() })
  await page.setContent('<main id="root"></main>')
  await page.evaluate(({ start }) => {
    window.fetch = async (input, options = {}) => {
      if (window.subscriptionRead) throw new Error('Unexpected extra subscription request')
      window.subscriptionRead = { url: String(input), signal: options.signal }
      return new Response(JSON.stringify({
        plan: 'essentiel', status: 'active', current_period_end: null,
        subscription_started_at: new Date(start - 30 * 86400_000 + 30_000).toISOString(),
        cancel_at_period_end: false, amount_cents: 1990, billing_interval: 'month',
      }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
  }, { start })
  await page.addScriptTag({ content: outputFiles[0].text })
  const age = page.locator('p').filter({ hasText: "Jours d'abonnement actif" })
  await expect(age).toContainText('29.')
  await expect(age).toContainText('Retrait wallet débloqué le')
  await page.clock.fastForward(60_000)
  await expect(age).toContainText('30.')
  await expect(age).toContainText('Retrait wallet disponible.')
  await page.clock.setSystemTime(start + 2 * 86400_000 + 60_000)
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await expect(age).toContainText('32.')
  expect(await page.evaluate(() => window.subscriptionRead.url)).toBe('/api/stripe/portal?action=status')
  await page.getByRole('button', { name: 'Quitter', exact: true }).click()
  await expect(page.getByText('Fermé', { exact: true })).toBeVisible()
  expect(await page.evaluate(() => window.subscriptionRead.signal?.aborted)).toBe(true)
  expect(external).toEqual([])
})
