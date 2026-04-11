import { test, expect } from "@playwright/test";

test.describe("Additional content pages", () => {
  test("/changelog lists v1.0", async ({ page }) => {
    const res = await page.goto("/changelog");
    expect(res?.status()).toBe(200);
    await expect(page.locator("body")).toContainText(/1\.0|v1/);
  });

  test("/contact shows form", async ({ page }) => {
    const res = await page.goto("/contact");
    expect(res?.status()).toBe(200);
    await expect(page.locator('input[type="email"]').first()).toBeVisible();
    await expect(page.locator("textarea").first()).toBeVisible();
  });

  test("/status loads live services list", async ({ page }) => {
    const res = await page.goto("/status");
    expect(res?.status()).toBe(200);
    await expect(page.locator("body")).toContainText(/Status|statut|API|Supabase|Stripe/i);
  });

  test("/blog stub is reachable", async ({ page }) => {
    const res = await page.goto("/blog");
    expect(res?.status()).toBe(200);
    await expect(page.locator("body")).toContainText(/blog|bientôt|venir/i);
  });
});
