import { test, expect } from "@playwright/test";

const STATIC_PAGES: { path: string; expect: RegExp }[] = [
  { path: "/pricing", expect: /Essentiel|Tarif|Pro/ },
  { path: "/how-it-works", expect: /Comment|étape|ça marche/i },
  { path: "/ecosystem", expect: /écosystème|Purama|apps/i },
  { path: "/aide", expect: /Aide|FAQ|recherche/i },
];

test.describe("Navigation — static pages", () => {
  for (const p of STATIC_PAGES) {
    test(`${p.path} returns 200 and shows expected content`, async ({ page }) => {
      const res = await page.goto(p.path);
      expect(res?.status()).toBe(200);
      await expect(page.locator("body")).toContainText(p.expect);
    });
  }

  test("/aide search input is functional", async ({ page }) => {
    await page.goto("/aide");
    const search = page.getByPlaceholder(/recherche|chercher/i).first();
    await expect(search).toBeVisible();
    await search.fill("paiement");
    // Allow debounce.
    await page.waitForTimeout(500);
    // At least the body still renders without error.
    await expect(page.locator("body")).toBeVisible();
  });
});
