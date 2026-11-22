import { expect, test, type Page } from '@playwright/test'
import { build } from 'esbuild'

interface FinancerRequest {
  url: string
  signal: AbortSignal | null | undefined
  resolve: (response: Response) => void
  reject: (reason: Error) => void
}

declare global {
  interface Window {
    financerRequests: FinancerRequest[]
  }
}

async function mount(page: Page) {
  const { outputFiles } = await build({
    stdin: {
      contents: `import React, { useState } from 'react';
        import { createRoot } from 'react-dom/client';
        import { Toaster } from 'sonner';
        import FinancerPage from './src/app/(dashboard)/financer/page';
        function Fixture() {
          const [open, setOpen] = useState(true);
          return <><button onClick={() => setOpen(false)}>Fermer la page de test</button>
            {open ? <FinancerPage /> : <p>Page fermée</p>}<Toaster /></>;
        }
        createRoot(document.getElementById('root')).render(<Fixture />);`,
      resolveDir: process.cwd(),
      loader: 'tsx',
    },
    bundle: true,
    write: false,
    jsx: 'automatic',
    define: { 'process.env': '{}', 'process.env.NODE_ENV': '"production"' },
  })
  const externalRequests: string[] = []
  await page.route('**/*', route => {
    externalRequests.push(route.request().url())
    return route.abort()
  })
  await page.setContent('<main id="root"></main>')
  await page.evaluate(() => {
    window.financerRequests = []
    window.fetch = (input, init = {}) => new Promise<Response>((resolve, reject) => {
      window.financerRequests.push({ url: String(input), signal: init.signal, resolve, reject })
    })
  })
  await page.addScriptTag({ content: outputFiles[0].text })
  await expect(page.getByRole('heading', { name: 'Quel est ton profil ?' })).toBeVisible()
  expect(await page.evaluate(() => window.financerRequests.length)).toBe(0)
  return externalRequests
}

async function chooseProfile(page: Page, profile: string, count: number) {
  await page.getByRole('button', { name: profile, exact: true }).click()
  await page.getByRole('button', { name: 'Voir les aides disponibles', exact: true }).click()
  await expect.poll(() => page.evaluate(() => window.financerRequests.length)).toBe(count)
}

async function respond(page: Page, index: number, name: string) {
  await page.evaluate(({ index, name }) => {
    window.financerRequests[index].resolve(new Response(JSON.stringify({ aides: [{
      id: name, nom: name, type_aide: 'consultation', profil_eligible: [],
      situation_eligible: [], montant_max: null, url_officielle: null,
      description: 'Donnée synthétique de test', region: null, handicap_only: false,
    }] }), { status: 200, headers: { 'content-type': 'application/json' } }))
  }, { index, name })
}

test('la recherche garde ses profils et sa navigation existante', async ({ page }) => {
  const external = await mount(page)
  await chooseProfile(page, 'Salarié(e)', 1)
  expect(await page.evaluate(() => window.financerRequests[0].url)).toBe('/api/financer?profil=salarie')
  await respond(page, 0, 'Aide synthétique salariée')
  await expect(page.getByRole('heading', { name: 'Aide synthétique salariée' })).toBeVisible()
  await page.getByRole('button', { name: 'Retour', exact: true }).click()
  await chooseProfile(page, 'Étudiant(e)', 2)
  expect(await page.evaluate(() => window.financerRequests[1].url)).toBe('/api/financer?profil=etudiant')
  await respond(page, 1, 'Aide synthétique étudiante')
  await expect(page.getByRole('heading', { name: 'Aide synthétique étudiante' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Aide synthétique salariée' })).toBeHidden()
  expect(external).toEqual([])
})

test('une erreur de recherche courante garde son message français', async ({ page }) => {
  const external = await mount(page)
  await chooseProfile(page, 'Indépendant(e)', 1)
  await page.evaluate(() => window.financerRequests[0].reject(new Error('private transport detail')))
  await expect(page.getByText('Impossible de charger les aides.', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Modifier mon profil', exact: true })).toBeVisible()
  await expect(page.getByText('private transport detail', { exact: true })).toBeHidden()
  expect(external).toEqual([])
})

test('quitter la page annule la lecture et supprime son erreur tardive', async ({ page }) => {
  const external = await mount(page)
  await chooseProfile(page, 'Salarié(e)', 1)
  // The fixture only controls React mounting, as navigation away from the route would do.
  await page.getByRole('button', { name: 'Fermer la page de test', exact: true }).click()
  await expect(page.getByText('Page fermée', { exact: true })).toBeVisible()
  expect(await page.evaluate(() => window.financerRequests[0].signal?.aborted)).toBe(true)
  // Deliberately ignore transport cancellation to exercise the late-error guard too.
  await page.evaluate(() => window.financerRequests[0].reject(new Error('late transport failure')))
  await page.evaluate(() => new Promise<void>(resolve => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  }))
  await expect(page.getByText('Impossible de charger les aides.', { exact: true })).toBeHidden()
  expect(external).toEqual([])
})
