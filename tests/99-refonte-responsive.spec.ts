import { test, expect, devices, Page } from '@playwright/test'

const BASE = process.env.PW_BASE_URL ?? 'http://localhost:3001'

const VIEWPORTS = [
  { name: 'mobile-375', width: 375, height: 812 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'laptop-1024', width: 1024, height: 768 },
  { name: 'desktop-1440', width: 1440, height: 900 },
] as const

const PAGES = ['/', '/pricing', '/how-it-works']

async function checkOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const docW = document.documentElement.clientWidth
    const issues: { tag: string; class: string; w: number }[] = []
    document.querySelectorAll('body *').forEach((el) => {
      const cs = window.getComputedStyle(el as HTMLElement)
      // Skip decorative pointer-events:none absolute elements
      if (cs.pointerEvents === 'none') return
      // Skip if any ancestor clips horizontally
      let p: HTMLElement | null = (el as HTMLElement).parentElement
      let clipped = false
      while (p) {
        const ps = window.getComputedStyle(p)
        if (ps.overflowX === 'hidden' || ps.overflow === 'hidden' || ps.overflowX === 'clip') {
          clipped = true
          break
        }
        p = p.parentElement
      }
      if (clipped) return
      const r = (el as HTMLElement).getBoundingClientRect()
      if (r.width > docW + 4 || r.right > docW + 4) {
        issues.push({
          tag: el.tagName,
          class: (el as HTMLElement).className?.toString?.().slice(0, 60) ?? '',
          w: Math.round(r.width),
        })
      }
    })
    return { docW, scrollW: document.documentElement.scrollWidth, issues: issues.slice(0, 5) }
  })
  return overflow
}

for (const vp of VIEWPORTS) {
  test.describe(`@${vp.name} ${vp.width}x${vp.height}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } })

    for (const path of PAGES) {
      test(`no overflow on ${path}`, async ({ page }) => {
        const errs: string[] = []
        page.on('pageerror', (e) => errs.push(e.message))

        await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' })
        await page.waitForTimeout(800)

        const result = await checkOverflow(page)
        expect(result.scrollW, `scrollW=${result.scrollW} docW=${result.docW}`).toBeLessThanOrEqual(result.docW + 4)
        expect(result.issues, JSON.stringify(result.issues)).toHaveLength(0)
        expect(errs).toHaveLength(0)
      })
    }
  })
}

test('landing has no fake savings stat', async ({ page }) => {
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
  const html = await page.content()
  // Must not display fake "10 000 €" or hard-coded savings
  expect(html).not.toMatch(/10[\u00A0\s]?000[\u00A0\s]?€/)
  expect(html).not.toMatch(/économisés par nos utilisateurs/)
})
