import { expect, test, type Page } from '@playwright/test'
import { build } from 'esbuild'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import type { JurisUser } from '../src/types'
import { settleUI } from './chat-stream-fixture'
import type {} from './fixtures/auth-session'

let bundle: Promise<string> | undefined

async function mountSession(page: Page) {
  bundle ??= build({
    entryPoints: ['tests/fixtures/auth-session.tsx'], bundle: true, write: false,
    jsx: 'automatic', define: { 'process.env.NODE_ENV': '"development"' },
    plugins: [{ name: 'controlled-supabase-transport', setup(builder) {
      builder.onResolve({ filter: /^@\/lib\/supabase$/ }, () => ({
        path: 'supabase-transport', namespace: 'auth-session-fixture',
      }))
      builder.onLoad({ filter: /.*/, namespace: 'auth-session-fixture' }, () => ({
        contents: 'export const createClient = () => window.authSessionDriver.client;',
      }))
    } }],
  }).then(result => result.outputFiles[0].text)

  const external: string[] = [], errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.route('**/*', route => { external.push(route.request().url()); return route.abort() })
  await page.routeWebSocket('**', route => { external.push(route.url()); route.close() })
  await page.setContent('<!doctype html><html lang="fr"><body><main id="root"></main></body></html>')
  await page.addScriptTag({ content: await bundle })
  await expect(page.getByRole('region', { name: 'Session de test' })).toBeVisible()
  // These counters prove that development StrictMode really replayed the effect.
  await expect.poll(() => page.evaluate(() => window.authSessionDriver.stats())).toMatchObject({
    subscriptions: 2, unsubscriptions: 1, activeSubscriptions: 1, initialReads: 2,
  })
  return { external, errors }
}

function sessionFor(id: string, token = `${id}-token`): Session {
  return {
    access_token: token, refresh_token: 'synthetic-refresh-token', expires_in: 3600, token_type: 'bearer',
    user: {
      id, app_metadata: {}, user_metadata: {}, aud: 'authenticated',
      email: `${id}@example.test`, created_at: '2026-11-22T00:00:00Z',
    },
  }
}

function profileFor(id: string): JurisUser {
  return {
    id: `profile-${id}`, auth_user_id: id, email: `${id}@example.test`, full_name: id,
    phone: null, address: null, birth_date: null, subscription_plan: 'free',
    stripe_customer_id: null, stripe_subscription_id: null, referral_code: null,
    referred_by: null, language: 'fr', role: 'user',
    created_at: '2026-11-22T00:00:00Z', updated_at: '2026-11-22T00:00:00Z',
  }
}

async function emit(page: Page, event: AuthChangeEvent, session: Session | null) {
  await page.evaluate(({ event, session }) => window.authSessionDriver.emit(event, session), { event, session })
}

async function start(page: Page, id: string) {
  await page.evaluate(session => window.authSessionDriver.resolveInitial(session), sessionFor(id))
  await expect(page.getByTestId('auth-user')).toHaveText(id)
  await expect.poll(() => page.evaluate(() => window.authSessionDriver.stats().profileReads.length)).toBe(1)
}

async function replyProfile(page: Page, index: number, id: string) {
  await page.evaluate(({ index, profile }) => window.authSessionDriver.resolveProfile(index, profile), {
    index, profile: profileFor(id),
  })
  await settleUI(page)
}

async function requestCount(page: Page, count: number) {
  await expect.poll(() => page.evaluate(() => window.authSessionDriver.stats().profileReads.length)).toBe(count)
}

async function expectSafeTransport(page: Page) {
  const stats = await page.evaluate(() => window.authSessionDriver.stats())
  expect(stats.profileReads.every(read => read.table === 'jurispurama_users'
    && read.kind === 'read' && read.userId !== null && !read.insideAuthCallback)).toBe(true)
  expect(stats.emittedPromises.every(value => value === false)).toBe(true)
}

test('StrictMode garde un seul abonnement actif et une seule lecture malgré les rendus', async ({ page }) => {
  const evidence = await mountSession(page)
  await start(page, 'alice')
  await emit(page, 'SIGNED_IN', sessionFor('alice'))
  await emit(page, 'SIGNED_IN', sessionFor('alice'))
  await replyProfile(page, 0, 'alice')
  await expect(page.getByTestId('auth-profile')).toHaveText('alice')
  await expect(page.getByRole('status')).toHaveText('Prêt')
  await page.getByRole('button', { name: 'Actualiser le cadre' }).click()
  await expect(page.getByTestId('frame-renders')).toHaveText('1')
  await emit(page, 'SIGNED_IN', sessionFor('alice'))
  await settleUI(page)
  await requestCount(page, 1)
  expect(await page.evaluate(() => window.authSessionDriver.stats())).toMatchObject({
    subscriptions: 2, unsubscriptions: 1, activeSubscriptions: 1, initialReads: 2,
  })
  await expectSafeTransport(page)
  await page.getByRole('button', { name: 'Quitter la session' }).click()
  await expect(page.getByText('Session démontée', { exact: true })).toBeVisible()
  expect(await page.evaluate(() => window.authSessionDriver.stats())).toMatchObject({
    subscriptions: 2, unsubscriptions: 2, activeSubscriptions: 0,
  })
  expect(evidence).toEqual({ external: [], errors: [] })
})

test('changer de compte puis se déconnecter ignore les profils devenus obsolètes', async ({ page }) => {
  const evidence = await mountSession(page)
  await start(page, 'alice')
  await replyProfile(page, 0, 'alice')
  await expect(page.getByTestId('auth-profile')).toHaveText('alice')
  await emit(page, 'SIGNED_IN', sessionFor('bob'))
  await requestCount(page, 2)
  await expect(page.getByTestId('auth-user')).toHaveText('bob')
  await expect(page.getByTestId('auth-profile')).toHaveText('aucun')
  await emit(page, 'SIGNED_IN', sessionFor('camille'))
  await requestCount(page, 3)
  await replyProfile(page, 1, 'bob')
  await expect(page.getByTestId('auth-user')).toHaveText('camille')
  await expect(page.getByTestId('auth-profile')).toHaveText('aucun')
  await expect(page.getByRole('status')).toHaveText('Chargement')
  await emit(page, 'SIGNED_OUT', null)
  await replyProfile(page, 2, 'camille')
  await expect(page.getByTestId('auth-user')).toHaveText('aucun')
  await expect(page.getByTestId('auth-profile')).toHaveText('aucun')
  await expect(page.getByTestId('auth-token')).toHaveText('aucun')
  await expect(page.getByRole('status')).toHaveText('Prêt')
  await requestCount(page, 3)
  expect(await page.evaluate(() => window.authSessionDriver.stats().profileReads.map(read => read.userId)))
    .toEqual(['alice', 'bob', 'camille'])
  await expectSafeTransport(page)
  expect(evidence).toEqual({ external: [], errors: [] })
})

test('un renouvellement de jeton conserve la lecture de profil en cours', async ({ page }) => {
  const evidence = await mountSession(page)
  await start(page, 'alice')
  await emit(page, 'TOKEN_REFRESHED', sessionFor('alice', 'renewed-token'))
  await expect(page.getByTestId('auth-token')).toHaveText('renewed-token')
  await expect(page.getByRole('status')).toHaveText('Chargement')
  await replyProfile(page, 0, 'alice')
  await expect(page.getByTestId('auth-profile')).toHaveText('alice')
  await expect(page.getByTestId('auth-token')).toHaveText('renewed-token')
  await expect(page.getByRole('status')).toHaveText('Prêt')
  await requestCount(page, 1)
  await expectSafeTransport(page)
  expect(evidence).toEqual({ external: [], errors: [] })
})

test('une initialisation tardive ne remplace pas la connexion déjà affichée', async ({ page }) => {
  const evidence = await mountSession(page)
  await emit(page, 'SIGNED_IN', sessionFor('bob'))
  await requestCount(page, 1)
  await replyProfile(page, 0, 'bob')
  await expect(page.getByTestId('auth-profile')).toHaveText('bob')
  await page.evaluate(session => window.authSessionDriver.resolveInitial(session), sessionFor('alice'))
  await settleUI(page)
  await expect(page.getByTestId('auth-user')).toHaveText('bob')
  await expect(page.getByTestId('auth-profile')).toHaveText('bob')
  await expect(page.getByTestId('auth-token')).toHaveText('bob-token')
  await expect(page.getByRole('status')).toHaveText('Prêt')
  await requestCount(page, 1)
  expect(await page.evaluate(() => window.authSessionDriver.stats().profileReads.map(read => read.userId))).toEqual(['bob'])
  await expectSafeTransport(page)
  expect(evidence).toEqual({ external: [], errors: [] })
})
