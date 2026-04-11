import { test, expect } from "@playwright/test";

test.describe("Responsive landing", () => {
  test("landing renders without horizontal overflow across viewports", async ({ page }) => {
    await page.goto("/");
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
    await expect(page.locator("body")).toContainText(/JurisPurama/);
  });

  test("landing primary CTA is visible", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("link", { name: /Essayer gratuitement/i }).first()
    ).toBeVisible();
  });

  test("footer is reachable after scroll", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(300);
    await expect(page.locator("footer")).toBeVisible();
  });
});
