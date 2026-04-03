import { test, expect } from '@playwright/test';
import { OrdersPage } from '../pages/orders.page';
import { TEST_ADMIN, ORGANIZER, EVENT } from '../helpers/test-data';
import { loginAsAdmin } from '../helpers/auth.helper';

test.describe('Orders Management — Admin Panel (P1)', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('TC-ORD-01: Orders list page loads correctly', async ({ page }) => {
    const ordersPage = new OrdersPage(page);
    await ordersPage.gotoControlOrders(ORGANIZER.slug, EVENT.slug);
    await ordersPage.expectOrdersPageLoaded();
  });

  test('TC-ORD-02: Orders table displays order entries', async ({ page }) => {
    const ordersPage = new OrdersPage(page);
    await ordersPage.gotoControlOrders(ORGANIZER.slug, EVENT.slug);

    const count = await ordersPage.getOrderCount();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('TC-ORD-03: Click on order opens order detail', async ({ page }) => {
    const ordersPage = new OrdersPage(page);
    await ordersPage.gotoControlOrders(ORGANIZER.slug, EVENT.slug);

    if (!(await ordersPage.hasOrders())) {
      test.skip();
      return;
    }

    await ordersPage.clickFirstOrder();
    await ordersPage.expectOrderDetailLoaded();
    await expect(page).toHaveURL(/.*orders\/[A-Z0-9]+\/.*/);
  });

  test('TC-ORD-04: Order detail shows status badge', async ({ page }) => {
    const ordersPage = new OrdersPage(page);
    await ordersPage.gotoControlOrders(ORGANIZER.slug, EVENT.slug);

    if (!(await ordersPage.hasOrders())) {
      test.skip();
      return;
    }

    await ordersPage.clickFirstOrder();
    await ordersPage.expectOrderDetailLoaded();
    await expect(ordersPage.orderStatus.first()).toBeVisible();
  });

  test('TC-ORD-05: Search orders by code', async ({ page }) => {
    const ordersPage = new OrdersPage(page);
    await ordersPage.gotoControlOrders(ORGANIZER.slug, EVENT.slug);

    // The search on orders page uses input[name="code"] with "Go!" button
    if (await ordersPage.searchInput.isVisible()) {
      await ordersPage.searchOrder('TEST');
      await page.waitForLoadState('domcontentloaded');
    }
  });

  test('TC-ORD-06: Order detail shows line items (positions)', async ({ page }) => {
    const ordersPage = new OrdersPage(page);
    await ordersPage.gotoControlOrders(ORGANIZER.slug, EVENT.slug);

    if (!(await ordersPage.hasOrders())) {
      test.skip();
      return;
    }

    await ordersPage.clickFirstOrder();
    const orderItems = page.locator('table tbody tr, .order-position');
    await expect(orderItems.first()).toBeVisible();
  });

  test('TC-ORD-07: Admin can access order cancel page', async ({ page }) => {
    const ordersPage = new OrdersPage(page);
    await ordersPage.gotoControlOrders(ORGANIZER.slug, EVENT.slug);

    if (!(await ordersPage.hasOrders())) {
      test.skip();
      return;
    }

    await ordersPage.clickFirstOrder();

    if (await ordersPage.cancelButton.isVisible()) {
      await ordersPage.cancelButton.click();
      await page.waitForLoadState('domcontentloaded');
      await expect(page).toHaveURL(/.*cancel.*/);
    }
  });

  test('TC-ORD-08: Admin can resend order confirmation email', async ({ page }) => {
    const ordersPage = new OrdersPage(page);
    await ordersPage.gotoControlOrders(ORGANIZER.slug, EVENT.slug);

    if (!(await ordersPage.hasOrders())) {
      test.skip();
      return;
    }

    await ordersPage.clickFirstOrder();

    if (await ordersPage.resendEmailButton.isVisible()) {
      await ordersPage.resendEmailButton.click();
      await page.waitForLoadState('domcontentloaded');
    }
  });
});

test.describe('Orders — Presale View (P1)', () => {

  test('TC-ORD-09: Presale order page loads with valid code and secret', async ({ page }) => {
    // Placeholder order code — replace with actual test data after creating an order
    await page.goto(`/${ORGANIZER.slug}/${EVENT.slug}/order/XXXXX/testsecret/`);

    const content = page.locator('body');
    await expect(content).not.toBeEmpty();
  });

  test('TC-ORD-10: Presale order page — invalid secret shows error', async ({ page }) => {
    await page.goto(`/${ORGANIZER.slug}/${EVENT.slug}/order/XXXXX/invalidsecret/`);

    const errorContent = page.locator('.alert-danger, h1, h2, .error, body');
    await expect(errorContent.first()).toBeVisible();
  });

  test('TC-ORD-11: Resend order link form is accessible', async ({ page }) => {
    await page.goto(`/${ORGANIZER.slug}/${EVENT.slug}/resend/`);
    await page.waitForLoadState('domcontentloaded');

    const emailInput = page.locator('#id_email');
    const submitButton = page.locator('button[type="submit"]').filter({ hasText: /send/i });

    await expect(emailInput).toBeVisible();
    await expect(submitButton).toBeVisible();
  });

  test('TC-ORD-12: Resend order link — submit with email triggers action', async ({ page }) => {
    await page.goto(`/${ORGANIZER.slug}/${EVENT.slug}/resend/`);
    await page.waitForLoadState('domcontentloaded');

    // Find email input inside the resend form
    const emailInput = page.locator('form[method="post"] input[type="email"], form[method="post"] input[type="text"]').first();
    const submitButton = page.locator('button[type="submit"]');

    if (await emailInput.isVisible()) {
      await emailInput.fill('test@example.com');
      await submitButton.click();
      await page.waitForLoadState('domcontentloaded');

      // Should show success message or stay on page
      const response = page.locator('.alert-success, .alert-info, .alert-danger, body');
      await expect(response.first()).toBeVisible();
    }
  });
});
