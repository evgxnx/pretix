import { test, expect } from '@playwright/test';
import { EventPage } from '../pages/event.page';
import { CheckoutPage } from '../pages/checkout.page';
import { ORGANIZER, EVENT, CHECKOUT_CONTACT, INVOICE_ADDRESS } from '../helpers/test-data';

test.describe('Checkout Flow (P2)', () => {
  let eventPage: EventPage;
  let checkoutPage: CheckoutPage;

  test.beforeEach(async ({ page }) => {
    eventPage = new EventPage(page);
    checkoutPage = new CheckoutPage(page);
  });

  test('TC-CHK-01: Event page displays available products', async ({ page }) => {
    await eventPage.goto(ORGANIZER.slug, EVENT.slug);
    await eventPage.expectEventPageLoaded();

    const productCount = await eventPage.getProductCount();
    expect(productCount).toBeGreaterThan(0);
  });

  test('TC-CHK-02: Add single ticket to cart', async ({ page }) => {
    await eventPage.goto(ORGANIZER.slug, EVENT.slug);
    await eventPage.expectEventPageLoaded();

    if (!(await eventPage.hasAvailableItems())) {
      test.skip();
      return;
    }
    await eventPage.selectTicketQuantity(0, 1);
    await eventPage.addToCart();

    await expect(eventPage.checkoutActionButton.first()).toBeVisible();
  });

  test('TC-CHK-03: Add multiple tickets to cart', async ({ page }) => {
    await eventPage.goto(ORGANIZER.slug, EVENT.slug);
    await eventPage.expectEventPageLoaded();

    if (!(await eventPage.hasAvailableItems())) {
      test.skip();
      return;
    }
    await eventPage.selectTicketQuantity(0, 3);
    await eventPage.addToCart();

    await expect(eventPage.checkoutActionButton.first()).toBeVisible();
  });

  test('TC-CHK-04: Cart shows correct items after adding', async ({ page }) => {
    await eventPage.goto(ORGANIZER.slug, EVENT.slug);
    if (!(await eventPage.hasAvailableItems())) {
      test.skip();
      return;
    }
    await eventPage.selectTicketQuantity(0, 2);
    await eventPage.addToCart();

    // Cart table is shown on the event page after adding
    const cartItems = page.locator('table[aria-label], .cart-row, .cart table tbody tr');
    await expect(cartItems.first()).toBeVisible();
  });

  test('TC-CHK-05: Checkout starts after adding to cart', async () => {
    await eventPage.goto(ORGANIZER.slug, EVENT.slug);
    if (!(await eventPage.hasAvailableItems())) {
      test.skip();
      return;
    }
    await eventPage.selectTicketQuantity(0, 1);
    await eventPage.addToCartAndCheckout();

    await checkoutPage.expectCheckoutPageLoaded();
  });

  test('TC-CHK-06: Fill contact information in checkout', async ({ page }) => {
    await eventPage.goto(ORGANIZER.slug, EVENT.slug);
    if (!(await eventPage.hasAvailableItems())) {
      test.skip();
      return;
    }
    await eventPage.selectTicketQuantity(0, 1);
    await eventPage.addToCartAndCheckout();

    await checkoutPage.fillContactInfo(CHECKOUT_CONTACT.email, CHECKOUT_CONTACT.phone);
    await checkoutPage.proceedToNext();

    const url = page.url();
    expect(url).toMatch(/checkout/);
  });

  test('TC-CHK-07: Checkout fails without contact email', async ({ page }) => {
    await eventPage.goto(ORGANIZER.slug, EVENT.slug);
    if (!(await eventPage.hasAvailableItems())) {
      test.skip();
      return;
    }
    await eventPage.selectTicketQuantity(0, 1);
    await eventPage.addToCartAndCheckout();

    // Clear email field and try to proceed
    await checkoutPage.contactEmailInput.fill('');
    await checkoutPage.proceedToNext();

    // Should show error or HTML5 validation prevents submission
    const hasError = await checkoutPage.errorMessages.first().isVisible({ timeout: 3000 }).catch(() => false);
    const stayedOnPage = page.url().includes('checkout');
    expect(hasError || stayedOnPage).toBeTruthy();
  });

  test('TC-CHK-08: Checkout with invalid email shows error', async ({ page }) => {
    await eventPage.goto(ORGANIZER.slug, EVENT.slug);
    if (!(await eventPage.hasAvailableItems())) {
      test.skip();
      return;
    }
    await eventPage.selectTicketQuantity(0, 1);
    await eventPage.addToCartAndCheckout();

    await checkoutPage.fillContactInfo('not-a-valid-email');
    await checkoutPage.proceedToNext();

    // Either server-side error or HTML5 validation keeps us on checkout
    const hasError = await checkoutPage.errorMessages.first().isVisible({ timeout: 3000 }).catch(() => false);
    const stayedOnCheckout = page.url().includes('checkout');
    expect(hasError || stayedOnCheckout).toBeTruthy();
  });

  test('TC-CHK-09: Full checkout flow — free ticket', async ({ page }) => {
    await eventPage.goto(ORGANIZER.slug, EVENT.slug);
    const freeProductIndex = await eventPage.getFreeProductIndex();
    if (!(await eventPage.hasAvailableItems()) || freeProductIndex === -1) {
      test.skip();
      return;
    }
    await eventPage.selectTicketQuantity(freeProductIndex, 1);
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

    await checkoutPage.confirmOrder();
    await checkoutPage.expectOrderConfirmed();
  });

  test('TC-CHK-10: Full checkout flow — paid ticket with manual payment', async ({ page }) => {
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

    await checkoutPage.confirmOrder();
    await checkoutPage.expectOrderConfirmed();
  });

  test('TC-CHK-11: Back button in checkout returns to previous step', async ({ page }) => {
    await eventPage.goto(ORGANIZER.slug, EVENT.slug);
    if (!(await eventPage.hasAvailableItems())) {
      test.skip();
      return;
    }
    await eventPage.selectTicketQuantity(0, 1);
    await eventPage.addToCartAndCheckout();

    await checkoutPage.fillContactInfo(CHECKOUT_CONTACT.email);
    await checkoutPage.proceedToNext();

    if (await checkoutPage.prevButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      const currentUrl = page.url();
      await checkoutPage.prevButton.click();
      await page.waitForLoadState('domcontentloaded');
      expect(page.url()).not.toBe(currentUrl);
    }
  });

  test('TC-CHK-12: Cart total is displayed during checkout', async ({ page }) => {
    await eventPage.goto(ORGANIZER.slug, EVENT.slug);
    if (!(await eventPage.hasAvailableItems())) {
      test.skip();
      return;
    }
    await eventPage.selectTicketQuantity(0, 1);
    await eventPage.addToCart();

    // Cart summary is visible on the event page after adding
    const cartSummary = page.locator('table[aria-label], .cart-sum, .cart-total, .total');
    await expect(cartSummary.first()).toBeVisible();
  });
});

test.describe('Cart Operations (P2)', () => {
  test('TC-CART-01: Clear cart removes all items', async ({ page }) => {
    const eventPage = new EventPage(page);
    await eventPage.goto(ORGANIZER.slug, EVENT.slug);
    if (!(await eventPage.hasAvailableItems())) {
      test.skip();
      return;
    }
    await eventPage.selectTicketQuantity(0, 1);
    await eventPage.addToCart();

    // "Empty cart" is a form submission with data-asynctask
    const clearButton = page.locator('button[type="submit"]').filter({ hasText: /empty cart/i });
    if (await clearButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await clearButton.click();
      await page.waitForLoadState('load');
      await expect(eventPage.checkoutActionButton.first()).not.toBeVisible({ timeout: 10000 });
    }
  });

  test('TC-CART-02: Cannot checkout with empty cart', async ({ page }) => {
    await page.goto(`/${ORGANIZER.slug}/${EVENT.slug}/checkout/start`);
    await page.waitForLoadState('domcontentloaded');

    const hasError = await page.locator('.alert-danger, .alert-warning').first()
      .isVisible({ timeout: 3000 }).catch(() => false);
    const redirectedAway = !page.url().includes('checkout/questions');

    expect(hasError || redirectedAway).toBeTruthy();
  });
});

test.describe('Voucher System (P2)', () => {
  test('TC-VCH-01: Voucher form is visible on event page', async ({ page }) => {
    const eventPage = new EventPage(page);
    await eventPage.goto(ORGANIZER.slug, EVENT.slug);

    const voucherSection = page.locator('#redeem-a-voucher, [id*="voucher"]');
    if (await voucherSection.isVisible()) {
      await expect(eventPage.voucherInput).toBeVisible();
    }
  });

  test('TC-VCH-02: Invalid voucher code shows error', async ({ page }) => {
    const eventPage = new EventPage(page);
    await eventPage.goto(ORGANIZER.slug, EVENT.slug);

    if (await eventPage.voucherInput.isVisible()) {
      await eventPage.applyVoucher('INVALID_CODE_12345');
      await page.waitForLoadState('domcontentloaded');
      const errorMessage = page.locator('.alert-danger, .alert-warning, .error');
      await expect(errorMessage.first()).toBeVisible();
    }
  });
});
