import { test, expect } from "@playwright/test";

test.describe("SEO + PWA", () => {
  test("/sitemap.xml returns 200 with <loc> entries", async ({ request }) => {
    const res = await request.get("/sitemap.xml");
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain("<loc>");
    expect(body).toContain("jurispurama.purama.dev");
  });

  test("/robots.txt returns 200 with Sitemap directive", async ({ request }) => {
    const res = await request.get("/robots.txt");
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toMatch(/Sitemap:/i);
  });

  test("/manifest.json returns 200 with JurisPurama name", async ({ request }) => {
    const res = await request.get("/manifest.json");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.name).toContain("JurisPurama");
  });

  test("/sw.js returns 200 and is JS", async ({ request }) => {
    const res = await request.get("/sw.js");
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body.length).toBeGreaterThan(10);
    expect(body).toMatch(/self|cache|fetch/);
  });

  test("/api/og returns image/png", async ({ request }) => {
    const res = await request.get("/api/og?title=Test");
    expect(res.status()).toBe(200);
    const ct = res.headers()["content-type"] || "";
    expect(ct).toContain("image/png");
  });
});
