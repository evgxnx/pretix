import { test, expect } from "@playwright/test";

const unauthOr404 = [401, 403, 404] as const;

test.describe("HTTP smoke", () => {
  const paths: [string, number[]][] = [
    ["/control/login", [200]],
    ["/control/login?next=/control/", [200]],
    ["/control/login?next=%2Fcontrol%2F", [200]],
    ["/api/v1/", [...unauthOr404]],
    ["/api/v1/organizers/", [401, 403]],
    ["/api/v1/events/", [...unauthOr404]],
    ["/api/v1/me/", [...unauthOr404]],
    ["/api/v1/devicekeys/", [...unauthOr404]],
    ["/api/v1/waitinglistentries/", [...unauthOr404]],
    ["/api/v1/cart/", [...unauthOr404]],
    ["/api/v1/checkinrpc/", [...unauthOr404]],
    ["/api/v1/orders/", [...unauthOr404]],
    ["/api/v1/revokedsecrets/", [...unauthOr404]],
    ["/api/v1/shredding/", [...unauthOr404]],
    ["/api/v1/assorted/", [...unauthOr404]],
  ];

  for (const [path, allowed] of paths) {
    test(`GET ${path} — статус из allowed`, async ({ request }) => {
      const res = await request.get(path, { maxRedirects: 0 });
      expect(allowed).toContain(res.status());
    });
  }

  for (const path of ["/", "/_health", "/health"]) {
    test(`GET ${path} — мягкая проверка`, async ({ request }) => {
      const res = await request.get(path, { maxRedirects: 10 });
      expect([200, 301, 302, 404]).toContain(res.status());
    });
  }

  test("страница логина: email и password", async ({ request }) => {
    const res = await request.get("/control/login");
    expect(res.status()).toBe(200);
    const t = await res.text();
    expect(t.includes('name="email"') || t.toLowerCase().includes("email")).toBeTruthy();
    expect(
      t.includes('name="password"') || t.toLowerCase().includes("password"),
    ).toBeTruthy();
    expect(t.toLowerCase()).toContain("<form");
  });

  test("/control/ без сессии — редирект или 403", async ({ request }) => {
    const res = await request.get("/control/", { maxRedirects: 0 });
    expect([302, 301, 303, 401, 403]).toContain(res.status());
  });

  test("POST /api/v1/organizers/ без токена отклонён", async ({ request }) => {
    const res = await request.post("/api/v1/organizers/", {
      data: { name: "x", slug: "x" },
    });
    expect([401, 403, 405]).toContain(res.status());
  });

  test("GET /api/v1/events|orders|cart без токена", async ({ request }) => {
    for (const p of ["/api/v1/events/", "/api/v1/orders/", "/api/v1/cart/"]) {
      const res = await request.get(p);
      expect(unauthOr404).toContain(res.status());
    }
  });

  test("логин — Content-Type HTML", async ({ request }) => {
    const res = await request.get("/control/login");
    const ct = res.headers()["content-type"] || "";
    expect(ct).toContain("text/html");
  });

  for (const badPath of [
    "/control/login/../../../etc/passwd",
    "/control/login?next=//evil.com",
  ]) {
    test(`путь не ломает сервер: ${badPath}`, async ({ request }) => {
      const res = await request.get(badPath, { maxRedirects: 10 });
      expect([200, 302, 301, 303, 400, 404]).toContain(res.status());
      const t = await res.text();
      expect(t).not.toContain("Traceback");
    });
  }
});

test.describe("API auth (негативные)", () => {
  for (const auth of [
    "Bearer invalid-token",
    "Token invalid",
    "Basic dGVzdDp0ZXN0",
  ]) {
    test(`organizers с ${auth.slice(0, 20)}…`, async ({ request }) => {
      const res = await request.get("/api/v1/organizers/", {
        headers: { Authorization: auth },
      });
      expect([401, 403]).toContain(res.status());
    });
  }

  test("пустой Authorization", async ({ request }) => {
    const res = await request.get("/api/v1/organizers/", {
      headers: { Authorization: "" },
    });
    expect([401, 403]).toContain(res.status());
  });

  test("POST organizers с битым JSON", async ({ request }) => {
    const res = await request.post("/api/v1/organizers/", {
      data: "{not-json",
      headers: { "Content-Type": "application/json" },
    });
    expect([400, 401, 403, 415]).toContain(res.status());
  });

  test("OPTIONS organizers", async ({ request }) => {
    const res = await request.fetch("/api/v1/organizers/", { method: "OPTIONS" });
    expect([200, 401, 403, 405]).toContain(res.status());
  });

  for (const method of ["GET", "POST", "PUT", "PATCH", "DELETE"] as const) {
    test(`cart ${method} без авторизации`, async ({ request }) => {
      const res = await request.fetch("/api/v1/cart/", { method });
      expect([401, 403, 404, 405]).toContain(res.status());
    });
  }

  for (const path of [
    "/api/v1/devicekeys/",
    "/api/v1/checkinrpc/",
    "/api/v1/waitinglistentries/",
    "/api/v1/revokedsecrets/",
    "/api/v1/shredding/",
    "/api/v1/assorted/",
    "/api/v1/me/",
  ]) {
    test(`GET ${path} без токена`, async ({ request }) => {
      const res = await request.get(path);
      expect(unauthOr404).toContain(res.status());
    });
  }
});

test.describe("TC05 — API с токеном (опционально)", () => {
  test("organizers без токена — 401/403", async ({ request }) => {
    const res = await request.get("/api/v1/organizers/");
    expect([401, 403]).toContain(res.status());
  });

  test("создание заказа с токеном", async ({ request }) => {
    const token = process.env.PRETIX_API_TOKEN;
    const org = process.env.PRETIX_ORGANIZER_SLUG;
    const ev = process.env.PRETIX_EVENT_SLUG;
    test.skip(
      !token || !org || !ev,
      "Задайте PRETIX_API_TOKEN, PRETIX_ORGANIZER_SLUG, PRETIX_EVENT_SLUG",
    );
    const email =
      process.env.PRETIX_CONTROL_EMAIL || "aslan.dzheleubaj.04@gmail.com";
    const res = await request.post(
      `/api/v1/organizers/${org}/events/${ev}/orders/`,
      {
        headers: {
          Authorization: `Token ${token}`,
          "Content-Type": "application/json",
        },
        data: {
          email,
          locale: "en",
          positions: [],
        },
      },
    );
    expect([201, 400, 422]).toContain(res.status());
  });
});

test.describe("TC06 / TC07 (опционально)", () => {
  test("ваучер по API", async ({ request }) => {
    const token = process.env.PRETIX_API_TOKEN;
    const org = process.env.PRETIX_ORGANIZER_SLUG;
    const ev = process.env.PRETIX_EVENT_SLUG;
    const code = process.env.PRETIX_VOUCHER_CODE;
    test.skip(
      !token || !org || !ev || !code,
      "Задайте PRETIX_API_TOKEN, PRETIX_ORGANIZER_SLUG, PRETIX_EVENT_SLUG, PRETIX_VOUCHER_CODE",
    );
    const res = await request.get(
      `/api/v1/organizers/${org}/events/${ev}/vouchers/${code}/`,
      { headers: { Authorization: `Token ${token}` } },
    );
    expect([200, 404]).toContain(res.status());
  });

  test("webhook callback", async ({ request }) => {
    const url = process.env.PRETIX_WEBHOOK_URL;
    const sig = process.env.PRETIX_WEBHOOK_SIGNATURE;
    test.skip(!url || !sig, "Задайте PRETIX_WEBHOOK_URL и PRETIX_WEBHOOK_SIGNATURE");
    const res = await request.post(url!, {
      headers: {
        "Content-Type": "application/json",
        "X-Pretix-Signature": sig!,
      },
      data: { payment: "fake-payment-id", status: "confirmed" },
    });
    expect([200, 202, 400, 401, 403]).toContain(res.status());
  });
});

test.describe("TC02 — Presale/public surface", () => {
  for (const path of [
    "/",
    "/events/",
    "/control/login?next=/",
    "/control/login?next=%2F",
  ]) {
    test(`публичный путь отвечает без 5xx: ${path}`, async ({ request }) => {
      const res = await request.get(path, { maxRedirects: 10 });
      expect([200, 301, 302, 303, 404]).toContain(res.status());
      expect(res.status()).toBeLessThan(500);
      const t = await res.text();
      expect(t).not.toContain("Traceback");
    });
  }

  test("control login page возвращает html", async ({ request }) => {
    const res = await request.get("/control/login");
    const ct = res.headers()["content-type"] || "";
    expect(ct).toContain("text/html");
  });
});

test.describe("Security hardening checks", () => {
  const nextPayloads = [
    "https://evil.example",
    "//evil.example/path",
    "javascript:alert(1)",
    "..%2f..%2f..%2f",
    "%2F%2Fevil.example",
    "/%5C%5Cevil.example",
  ];

  for (const payload of nextPayloads) {
    test(`login next payload does not 500: ${payload}`, async ({ request }) => {
      const res = await request.get(`/control/login?next=${payload}`, {
        maxRedirects: 10,
      });
      expect([200, 301, 302, 303, 400, 404]).toContain(res.status());
      expect(res.status()).toBeLessThan(500);
    });
  }

  for (const path of ["/api/v1/organizers/", "/api/v1/cart/", "/control/login"]) {
    test(`HEAD ${path} returns safe status`, async ({ request }) => {
      const res = await request.fetch(path, { method: "HEAD", maxRedirects: 0 });
      expect([200, 301, 302, 303, 400, 401, 403, 404, 405]).toContain(res.status());
    });
  }
});
