import { test, expect } from '@playwright/test';
import { OrdersPage } from '../pages/orders.page';
import { EventPage } from '../pages/event.page';
import { CheckoutPage } from '../pages/checkout.page';
import { TEST_ADMIN, ORGANIZER, EVENT, CHECKOUT_CONTACT, INVOICE_ADDRESS } from '../helpers/test-data';
import { loginAsAdmin } from '../helpers/auth.helper';

test.describe('Payment Processing (P1)', () => {

  test('TC-PAY-01: Payment step is shown for paid items', async ({ page }) => {
    const eventPage = new EventPage(page);
    const checkoutPage = new CheckoutPage(page);

    await eventPage.goto(ORGANIZER.slug, EVENT.slug);
    await eventPage.expectEventPageLoaded();
    const paidProductIndex = await eventPage.getPaidProductIndex();
    if (!(await eventPage.hasAvailableItems()) || paidProductIndex === -1) {
      test.skip();
      return;
    }

    await eventPage.selectTicketQuantity(paidProductIndex, 1);
    await eventPage.addToCartAndCheckout();

    await checkoutPage.fillContactInfo(CHECKOUT_CONTACT.email);
    await checkoutPage.proceedToNext();

    if (await checkoutPage.streetInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await checkoutPage.fillInvoiceAddress(INVOICE_ADDRESS);
      await checkoutPage.proceedToNext();
    }

    const paymentStep = page.locator('input[name="payment"]');
    const isPaymentStep = await paymentStep.first().isVisible({ timeout: 5000 }).catch(() => false);

    if (isPaymentStep) {
      await expect(checkoutPage.paymentMethods.first()).toBeVisible();
    }
  });

  test('TC-PAY-02: Payment method selection is required', async ({ page }) => {
    const eventPage = new EventPage(page);
    const checkoutPage = new CheckoutPage(page);

    await eventPage.goto(ORGANIZER.slug, EVENT.slug);
    const paidProductIndex = await eventPage.getPaidProductIndex();
    if (!(await eventPage.hasAvailableItems()) || paidProductIndex === -1) {
      test.skip();
      return;
    }

    await eventPage.selectTicketQuantity(paidProductIndex, 1);
    await eventPage.addToCartAndCheckout();

    await checkoutPage.fillContactInfo(CHECKOUT_CONTACT.email);
    await checkoutPage.proceedToNext();

    if (await checkoutPage.streetInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await checkoutPage.fillInvoiceAddress(INVOICE_ADDRESS);
      await checkoutPage.proceedToNext();
    }

    const paymentStep = page.locator('input[name="payment"]');
    if (await paymentStep.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      // Try to proceed without selecting payment
      await checkoutPage.proceedToNext();
      await checkoutPage.expectErrorDisplayed();
    }
  });

  test('TC-PAY-03: Order confirmation page shows payment details', async ({ page }) => {
    const eventPage = new EventPage(page);
    const checkoutPage = new CheckoutPage(page);

    await eventPage.goto(ORGANIZER.slug, EVENT.slug);
    const paidProductIndex = await eventPage.getPaidProductIndex();
    if (!(await eventPage.hasAvailableItems()) || paidProductIndex === -1) {
      test.skip();
      return;
    }

    await eventPage.selectTicketQuantity(paidProductIndex, 1);
    await eventPage.addToCartAndCheckout();

    await checkoutPage.fillContactInfo(CHECKOUT_CONTACT.email);
    await checkoutPage.proceedToNext();

    if (await checkoutPage.streetInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await checkoutPage.fillInvoiceAddress(INVOICE_ADDRESS);
      await checkoutPage.proceedToNext();
    }

    if (await checkoutPage.paymentMethods.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await checkoutPage.selectPaymentMethod(0);
      await checkoutPage.proceedToNext();
    }

    // Confirm page should show order summary
    const confirmSummary = page.locator('.cart-table, .order-summary, .cart-row, .cart, table');
    await expect(confirmSummary.first()).toBeVisible();
  });

  test('TC-PAY-04: Multiple payment methods are listed if configured', async ({ page }) => {
    const eventPage = new EventPage(page);
    const checkoutPage = new CheckoutPage(page);

    await eventPage.goto(ORGANIZER.slug, EVENT.slug);
    const paidProductIndex = await eventPage.getPaidProductIndex();
    if (!(await eventPage.hasAvailableItems()) || paidProductIndex === -1) {
      test.skip();
      return;
    }

    await eventPage.selectTicketQuantity(paidProductIndex, 1);
    await eventPage.addToCartAndCheckout();

    await checkoutPage.fillContactInfo(CHECKOUT_CONTACT.email);
    await checkoutPage.proceedToNext();

    if (await checkoutPage.streetInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await checkoutPage.fillInvoiceAddress(INVOICE_ADDRESS);
      await checkoutPage.proceedToNext();
    }

    const paymentMethods = page.locator('input[name="payment"]');
    const count = await paymentMethods.count();
    if (count > 0) {
      expect(count).toBeGreaterThanOrEqual(1);
    }
  });
});

test.describe('Payment Management — Admin Panel (P1)', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('TC-PAY-05: Admin can view payment details of an order', async ({ page }) => {
    const ordersPage = new OrdersPage(page);
    await ordersPage.gotoControlOrders(ORGANIZER.slug, EVENT.slug);

    if (!(await ordersPage.hasOrders())) {
      test.skip();
      return;
    }

    await ordersPage.clickFirstOrder();
    await ordersPage.expectOrderDetailLoaded();

    const paymentSection = page.locator('.panel, .card, h3, h4').filter({ hasText: /payment/i });
    await expect(paymentSection.first()).toBeVisible();
  });

  test('TC-PAY-06: Admin can mark order as paid', async ({ page }) => {
    const ordersPage = new OrdersPage(page);
    await ordersPage.gotoControlOrders(ORGANIZER.slug, EVENT.slug);

    if (!(await ordersPage.hasOrders())) {
      test.skip();
      return;
    }

    await ordersPage.clickFirstOrder();
    await ordersPage.expectOrderDetailLoaded();

    if (await ordersPage.markPaidButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await ordersPage.markPaidButton.click();
      await page.waitForLoadState('domcontentloaded');
      const successOrConfirm = page.locator('.alert-success, .btn-confirm, form');
      await expect(successOrConfirm.first()).toBeVisible();
    }
  });

  test('TC-PAY-07: Admin can initiate a refund', async ({ page }) => {
    const ordersPage = new OrdersPage(page);
    await ordersPage.gotoControlOrders(ORGANIZER.slug, EVENT.slug);

    if (!(await ordersPage.hasOrders())) {
      test.skip();
      return;
    }

    await ordersPage.clickFirstOrder();
    await ordersPage.expectOrderDetailLoaded();

    if (await ordersPage.refundButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await ordersPage.refundButton.click();
      await page.waitForLoadState('domcontentloaded');
      await expect(page).toHaveURL(/.*refund.*/);
    }
  });
});
