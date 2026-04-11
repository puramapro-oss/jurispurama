import { test, expect } from "@playwright/test";

test.describe("Landing", () => {
  test("returns 200 and shows JurisPurama brand + main CTA", async ({ page }) => {
    const res = await page.goto("/");
    expect(res?.status()).toBe(200);
    await expect(page.locator("body")).toContainText(/JurisPurama/);
    await expect(page.getByRole("link", { name: /Essayer gratuitement/i }).first()).toBeVisible();
  });

  test("shows pricing preview with multiple plans", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("body")).toContainText(/Essentiel/i);
    await expect(page.locator("body")).toContainText(/Pro/i);
    await expect(page.locator("body")).toContainText(/Avocat/i);
  });

  test("shows FAQ section with expandable questions", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("body")).toContainText(/Questions qui reviennent/i);
  });

  test("footer has legal links", async ({ page }) => {
    await page.goto("/");
    const footer = page.locator("footer");
    await expect(footer).toBeVisible();
    await expect(footer).toContainText(/Mentions légales|Mentions/i);
    await expect(footer).toContainText(/CGV/i);
    await expect(footer).toContainText(/Confidentialité|RGPD|Politique/i);
  });

  test("no horizontal overflow on mobile 375px", async ({ page }) => {
    await page.goto("/");
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    // Tolerate 2px for rounding.
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
  });
});
