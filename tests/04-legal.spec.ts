import { test, expect } from "@playwright/test";

test.describe("Legal pages", () => {
  test("/mentions-legales shows SASU PURAMA", async ({ page }) => {
    const res = await page.goto("/mentions-legales");
    expect(res?.status()).toBe(200);
    await expect(page.locator("body")).toContainText(/SASU PURAMA/);
  });

  test("/cgv returns 200", async ({ page }) => {
    const res = await page.goto("/cgv");
    expect(res?.status()).toBe(200);
    await expect(page.locator("body")).toContainText(/CGV|conditions générales/i);
  });

  test("/cgu returns 200", async ({ page }) => {
    const res = await page.goto("/cgu");
    expect(res?.status()).toBe(200);
    await expect(page.locator("body")).toContainText(/CGU|utilisation/i);
  });

  test("/politique-confidentialite mentions RGPD", async ({ page }) => {
    const res = await page.goto("/politique-confidentialite");
    expect(res?.status()).toBe(200);
    await expect(page.locator("body")).toContainText(/RGPD/);
  });

  test("/cookies page loads", async ({ page }) => {
    const res = await page.goto("/cookies");
    expect(res?.status()).toBe(200);
    await expect(page.locator("body")).toContainText(/cookies/i);
  });
});
