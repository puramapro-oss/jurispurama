import { test, expect } from "@playwright/test";

test.describe("API — auth guards and health", () => {
  test("GET /api/status returns ok payload", async ({ request }) => {
    const res = await request.get("/api/status");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.app).toBe("jurispurama");
  });

  test("GET /api/cases without auth returns 401", async ({ request }) => {
    const res = await request.get("/api/cases");
    expect(res.status()).toBe(401);
  });

  test("POST /api/ai/chat without auth returns 401", async ({ request }) => {
    const res = await request.post("/api/ai/chat", {
      data: { message: "test" },
    });
    expect(res.status()).toBe(401);
  });

  test("POST /api/stripe/checkout without auth returns 401 or 400", async ({ request }) => {
    const res = await request.post("/api/stripe/checkout", { data: {} });
    // 401 when auth-guarded first, 400 when body-validated first — both prove endpoint is live and rejecting.
    expect([400, 401]).toContain(res.status());
  });

  test("GET /api/admin/stats without auth returns 401 or 403", async ({ request }) => {
    const res = await request.get("/api/admin/stats");
    expect([401, 403]).toContain(res.status());
  });
});
