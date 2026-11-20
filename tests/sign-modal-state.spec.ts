import { expect, test, type Page } from '@playwright/test'
import { build } from 'esbuild'

async function drawSignature(page: Page) {
  const canvas = page.getByRole('dialog').locator('canvas')
  await canvas.scrollIntoViewIfNeeded()
  const box = await canvas.boundingBox()
  if (!box) throw new Error('La zone de signature doit être visible')
  await page.mouse.move(box.x + 8, box.y + 8)
  await page.mouse.down()
  await page.mouse.move(box.x + 45, box.y + 32, { steps: 7 })
  await page.mouse.up()
}

test('conserve le brouillon lors d’une actualisation et le réinitialise à la prochaine ouverture ou au changement de document', async ({ page }) => {
  const { outputFiles } = await build({
    entryPoints: ['tests/fixtures/signature-dialog.tsx'],
    bundle: true,
    write: false,
    jsx: 'automatic',
    define: { 'process.env.NODE_ENV': '"production"' },
  })
  const requests: string[] = []
  await page.route('**/*', route => {
    requests.push(route.request().url())
    return route.abort()
  })
  await page.setContent('<main id="root"></main>')
  await page.addScriptTag({ content: outputFiles[0].text })

  const dialog = page.getByRole('dialog')
  const consent = dialog.getByRole('checkbox')
  const sign = dialog.getByRole('button', { name: /Signer le document/ })
  await consent.check()
  await drawSignature(page)
  await expect(sign).toBeEnabled()
  await page.getByRole('button', { name: 'Actualiser 0' }).click()
  await expect(page.getByRole('button', { name: 'Actualiser 1' })).toBeVisible()
  await expect(consent).toBeChecked()
  await expect(sign).toBeEnabled()

  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await page.getByRole('button', { name: 'Ouvrir' }).click()
  await expect(consent).not.toBeChecked()
  await consent.check()
  await expect(sign).toBeDisabled()
  await drawSignature(page)
  await expect(sign).toBeEnabled()

  await page.getByRole('button', { name: 'Autre document' }).click()
  await expect(dialog.getByText('B', { exact: true })).toBeVisible()
  await expect(consent).not.toBeChecked()
  await consent.check()
  await expect(sign).toBeDisabled()
  expect(requests).toEqual([])
})
