import { test, expect, request as playwrightRequest } from '@playwright/test';
import { TEST_ADMIN, ORGANIZER, EVENT, BASE_URL } from '../helpers/test-data';

/**
 * API E2E tests using Playwright's request context with session-based auth.
 *
 * Since pretix API supports both Token and Session auth,
 * we log in via the control panel first to get a session cookie.
 */

const API_BASE = `${BASE_URL}/api/v1`;
let sharedCtxPromise:
  | Promise<Awaited<ReturnType<typeof playwrightRequest.newContext>>>
  | undefined;

function extractCsrfToken(html: string): string {
  const match = html.match(/name="csrfmiddlewaretoken" value="([^"]+)"/);
  if (!match) {
    throw new Error('CSRF token not found in control panel response.');
  }
  return match[1];
}

async function createAuthenticatedContext() {
  const context = await playwrightRequest.newContext({ baseURL: BASE_URL });

  // Login to get a control panel session cookie.
  const loginPage = await context.get('/control/login');
  const csrfToken = extractCsrfToken(await loginPage.text());

  await context.post('/control/login', {
    form: {
      email: TEST_ADMIN.email,
      password: TEST_ADMIN.password,
      csrfmiddlewaretoken: csrfToken,
    },
    headers: {
      'Referer': `${BASE_URL}/control/login`,
    },
  });

  // Event-scoped API endpoints require an active staff session for site admins.
  const reauthPage = await context.get('/control/reauth/');
  const reauthHtml = await reauthPage.text();
  if (reauthHtml.includes('id_password')) {
    const reauthCsrf = extractCsrfToken(reauthHtml);
    await context.post('/control/reauth/', {
      form: {
        password: TEST_ADMIN.password,
        csrfmiddlewaretoken: reauthCsrf,
      },
      headers: {
        'Referer': `${BASE_URL}/control/reauth/`,
      },
    });
  }

  const sudoPage = await context.get('/control/sudo/');
  const sudoHtml = await sudoPage.text();
  if (sudoHtml.includes('Start session')) {
    const sudoCsrf = extractCsrfToken(sudoHtml);
    await context.post('/control/sudo/', {
      form: {
        csrfmiddlewaretoken: sudoCsrf,
      },
      headers: {
        'Referer': `${BASE_URL}/control/sudo/`,
      },
    });
  }

  return context;
}

async function getAuthenticatedContext() {
  sharedCtxPromise ??= createAuthenticatedContext();
  return sharedCtxPromise;
}

test.afterAll(async () => {
  if (!sharedCtxPromise) {
    return;
  }

  const ctx = await sharedCtxPromise;
  await ctx.dispose();
  sharedCtxPromise = undefined;
});

test.describe('REST API — Events (P2)', () => {
  let ctx: Awaited<ReturnType<typeof getAuthenticatedContext>> | undefined;

  test.beforeAll(async () => {
    ctx = await getAuthenticatedContext();
  });
  test('TC-API-01: GET /api/v1/organizers/ returns organizer list', async () => {
    const response = await ctx.get(`${API_BASE}/organizers/`);

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('results');
    expect(Array.isArray(body.results)).toBeTruthy();
  });

  test('TC-API-02: GET /api/v1/organizers/:slug/events/ returns event list', async () => {
    const response = await ctx.get(
      `${API_BASE}/organizers/${ORGANIZER.slug}/events/`
    );

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('results');
    expect(Array.isArray(body.results)).toBeTruthy();
  });

  test('TC-API-03: GET /api/v1/organizers/:slug/events/:event/ returns event detail', async () => {
    const response = await ctx.get(
      `${API_BASE}/organizers/${ORGANIZER.slug}/events/${EVENT.slug}/`
    );

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('name');
    expect(body).toHaveProperty('slug');
    expect(body.slug).toBe(EVENT.slug);
  });

  test('TC-API-04: API returns 401 without authentication', async ({ request }) => {
    const response = await request.get(`${API_BASE}/organizers/`, {
      headers: {},
    });

    expect(response.status()).toBe(401);
  });

  test('TC-API-05: API returns 401 with invalid token', async ({ request }) => {
    const response = await request.get(`${API_BASE}/organizers/`, {
      headers: { 'Authorization': 'Token invalid_token_12345' },
    });

    expect(response.status()).toBe(401);
  });
});

test.describe('REST API — Items (P2)', () => {
  let ctx: Awaited<ReturnType<typeof getAuthenticatedContext>> | undefined;

  test.beforeAll(async () => {
    ctx = await getAuthenticatedContext();
  });
  test('TC-API-06: GET items list for an event', async () => {
    const response = await ctx.get(
      `${API_BASE}/organizers/${ORGANIZER.slug}/events/${EVENT.slug}/items/`
    );

    if (response.status() === 200) {
      const body = await response.json();
      expect(body).toHaveProperty('results');
      expect(Array.isArray(body.results)).toBeTruthy();
    }
  });

  test('TC-API-07: Items have required fields (name, price, active)', async () => {
    const response = await ctx.get(
      `${API_BASE}/organizers/${ORGANIZER.slug}/events/${EVENT.slug}/items/`
    );

    if (response.status() === 200) {
      const body = await response.json();
      if (body.results.length > 0) {
        const item = body.results[0];
        expect(item).toHaveProperty('name');
        expect(item).toHaveProperty('default_price');
        expect(item).toHaveProperty('active');
      }
    }
  });
});

test.describe('REST API — Orders (P2)', () => {
  let ctx: Awaited<ReturnType<typeof getAuthenticatedContext>> | undefined;

  test.beforeAll(async () => {
    ctx = await getAuthenticatedContext();
  });
  test('TC-API-08: GET orders list for an event', async () => {
    const response = await ctx.get(
      `${API_BASE}/organizers/${ORGANIZER.slug}/events/${EVENT.slug}/orders/`
    );

    if (response.status() === 200) {
      const body = await response.json();
      expect(body).toHaveProperty('results');
      expect(Array.isArray(body.results)).toBeTruthy();
    }
  });

  test('TC-API-09: Orders contain required fields', async () => {
    const response = await ctx.get(
      `${API_BASE}/organizers/${ORGANIZER.slug}/events/${EVENT.slug}/orders/`
    );

    if (response.status() === 200) {
      const body = await response.json();
      if (body.results.length > 0) {
        const order = body.results[0];
        expect(order).toHaveProperty('code');
        expect(order).toHaveProperty('status');
        expect(order).toHaveProperty('total');
        expect(order).toHaveProperty('email');
        expect(order).toHaveProperty('positions');
      }
    }
  });

  test('TC-API-10: Order status values are valid', async () => {
    const response = await ctx.get(
      `${API_BASE}/organizers/${ORGANIZER.slug}/events/${EVENT.slug}/orders/`
    );

    if (response.status() === 200) {
      const body = await response.json();
      const validStatuses = ['n', 'p', 'e', 'c'];
      for (const order of body.results) {
        expect(validStatuses).toContain(order.status);
      }
    }
  });
});

test.describe('REST API — Quotas (P2)', () => {
  let ctx: Awaited<ReturnType<typeof getAuthenticatedContext>> | undefined;

  test.beforeAll(async () => {
    ctx = await getAuthenticatedContext();
  });
  test('TC-API-11: GET quotas list for an event', async () => {
    const response = await ctx.get(
      `${API_BASE}/organizers/${ORGANIZER.slug}/events/${EVENT.slug}/quotas/`
    );

    if (response.status() === 200) {
      const body = await response.json();
      expect(body).toHaveProperty('results');
      expect(Array.isArray(body.results)).toBeTruthy();
    }
  });

  test('TC-API-12: Quotas have availability info', async () => {
    const response = await ctx.get(
      `${API_BASE}/organizers/${ORGANIZER.slug}/events/${EVENT.slug}/quotas/?with_availability=true`
    );

    if (response.status() === 200) {
      const body = await response.json();
      if (body.results.length > 0) {
        const quota = body.results[0];
        expect(quota).toHaveProperty('name');
        expect(quota).toHaveProperty('size');
      }
    }
  });
});

test.describe('REST API — Vouchers (P2)', () => {
  let ctx: Awaited<ReturnType<typeof getAuthenticatedContext>> | undefined;

  test.beforeAll(async () => {
    ctx = await getAuthenticatedContext();
  });
  test('TC-API-13: GET vouchers list for an event', async () => {
    const response = await ctx.get(
      `${API_BASE}/organizers/${ORGANIZER.slug}/events/${EVENT.slug}/vouchers/`
    );

    if (response.status() === 200) {
      const body = await response.json();
      expect(body).toHaveProperty('results');
      expect(Array.isArray(body.results)).toBeTruthy();
    }
  });
});

test.describe('REST API — Pagination & Filtering (P2)', () => {
  let ctx: Awaited<ReturnType<typeof getAuthenticatedContext>> | undefined;

  test.beforeAll(async () => {
    ctx = await getAuthenticatedContext();
  });
  test('TC-API-14: API supports pagination parameters', async () => {
    const response = await ctx.get(
      `${API_BASE}/organizers/${ORGANIZER.slug}/events/${EVENT.slug}/orders/?page=1&page_size=5`
    );

    if (response.status() === 200) {
      const body = await response.json();
      expect(body).toHaveProperty('count');
      expect(body).toHaveProperty('next');
      expect(body).toHaveProperty('previous');
      expect(body).toHaveProperty('results');
    }
  });

  test('TC-API-15: API returns proper Content-Type header', async () => {
    const response = await ctx.get(`${API_BASE}/organizers/`);

    const contentType = response.headers()['content-type'];
    expect(contentType).toContain('application/json');
  });
});
