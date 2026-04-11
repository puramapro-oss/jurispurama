import { test, expect } from "@playwright/test";

test.describe("Auth pages", () => {
  test("/login renders form with email + password + Google", async ({ page }) => {
    const res = await page.goto("/login");
    expect(res?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: /Connexion/i })).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole("button", { name: /Google/i }).first()).toBeVisible();
  });

  test("/signup renders full form", async ({ page }) => {
    const res = await page.goto("/signup");
    expect(res?.status()).toBe(200);
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test("/forgot-password loads", async ({ page }) => {
    const res = await page.goto("/forgot-password");
    expect(res?.status()).toBe(200);
    await expect(page.locator("body")).toContainText(/mot de passe|réinitialis|email/i);
  });

  test("login form blocks empty submit and stays on /login", async ({ page }) => {
    await page.goto("/login");
    // HTML5 validation will prevent submission when required fields empty.
    const submit = page.getByRole("button", { name: /Connexion|Se connecter|Connecter/i }).first();
    await submit.click().catch(() => undefined);
    await page.waitForTimeout(500);
    expect(page.url()).toContain("/login");
  });

  test("/dashboard without auth redirects to /login", async ({ page }) => {
    const res = await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    // Middleware should redirect 302 → /login?next=/dashboard
    expect(page.url()).toContain("/login");
    expect(res?.status()).toBeLessThan(500);
  });
});
