import { type Page, type Locator, expect } from '@playwright/test';

export class EventPage {
  readonly page: Page;
  readonly eventTitle: Locator;
  readonly productList: Locator;
  readonly productRows: Locator;
  readonly addToCartButton: Locator;
  readonly checkoutActionButton: Locator;
  readonly quantityInputs: Locator;
  readonly checkboxInputs: Locator;
  readonly cartBox: Locator;
  readonly voucherInput: Locator;
  readonly voucherApplyButton: Locator;
  readonly presaleAlert: Locator;
  readonly soldOutBadge: Locator;
  readonly processingHeading: Locator;
  readonly cartHeading: Locator;
  readonly cartSuccessMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.eventTitle = page.locator('h2.content-header, .subevent-head').first();
    this.productList = page.locator('.item-category');
    this.productRows = page.locator('.product-row');
    this.addToCartButton = page.locator('#btn-add-to-cart');
    this.checkoutActionButton = page.locator('button, a').filter({
      hasText: /proceed with checkout|continue with order process|resume checkout|continue/i,
    });
    // pretix uses input-item-count class for quantity and name="item_<id>" or "variation_<id>_<id>"
    this.quantityInputs = page.locator('input.input-item-count, input[type="number"]');
    this.checkboxInputs = page.locator('.availability-box input[type="checkbox"]');
    this.cartBox = page.locator('.cart-box, .panel-primary');
    this.voucherInput = page.locator('input[name="voucher"]');
    this.voucherApplyButton = page.locator('form:has(input[name="voucher"]) button[type="submit"]');
    this.presaleAlert = page.locator('.alert-info');
    this.soldOutBadge = page.locator('.availability-box .gone');
    this.processingHeading = page.locator('h1, h2, h3').filter({ hasText: /we are processing your request/i }).first();
    this.cartHeading = page.locator('h1, h2, h3').filter({ hasText: /your cart/i }).first();
    this.cartSuccessMessage = page.getByText(/products have been successfully added to your cart/i);
  }

  async goto(organizer: string, event: string) {
    await this.page.goto(`/${organizer}/${event}/`, { waitUntil: 'domcontentloaded' });
  }

  async expectEventPageLoaded() {
    // Either products exist or at least the page loaded (empty-collection or presale alert)
    await this.page.waitForLoadState('domcontentloaded');
    const hasProducts = await this.productList.first().isVisible({ timeout: 5000 }).catch(() => false);
    const hasAlert = await this.presaleAlert.first().isVisible({ timeout: 1000 }).catch(() => false);
    expect(hasProducts || hasAlert).toBeTruthy();
  }

  async expectProductsVisible() {
    await expect(this.productRows.first()).toBeVisible();
  }

  async selectTicketQuantity(index: number, quantity: number) {
    const countInputs = this.quantityInputs;
    const count = await countInputs.count();

    if (count > 0) {
      await countInputs.nth(index).fill(String(quantity));
    } else {
      // Items with order_max=1 use checkbox instead of number input
      const checkbox = this.checkboxInputs.nth(index);
      if (await checkbox.isVisible()) {
        await checkbox.check();
      }
    }
  }

  async addToCart() {
    await this.addToCartButton.click();
    await this.waitForCartUpdate();
    await expect(this.checkoutActionButton.first()).toBeVisible({ timeout: 20000 });
  }

  async proceedToCheckout() {
    await Promise.all([
      this.page.waitForURL(/.*checkout.*/, { waitUntil: 'commit', timeout: 15000 }),
      this.checkoutActionButton.first().click(),
    ]);
  }

  async addToCartAndCheckout() {
    await this.addToCartButton.click();
    await this.waitForCartUpdate();
    await expect(this.checkoutActionButton.first()).toBeVisible({ timeout: 20000 });
    await Promise.all([
      this.page.waitForURL(/.*checkout.*/, { waitUntil: 'commit', timeout: 15000 }),
      this.checkoutActionButton.first().click(),
    ]);
  }

  async applyVoucher(code: string) {
    await this.voucherInput.fill(code);
    await this.voucherApplyButton.click();
  }

  async expectPresaleNotStarted() {
    await expect(this.presaleAlert).toContainText(/booking period|presale|not yet started/i);
  }

  async expectSoldOut() {
    await expect(this.soldOutBadge.first()).toBeVisible();
  }

  async getProductCount(): Promise<number> {
    return this.productRows.count();
  }

  async getFreeProductIndex(): Promise<number> {
    return this.findProductIndexByPrice(price => price === 0);
  }

  async getPaidProductIndex(): Promise<number> {
    return this.findProductIndexByPrice(price => price > 0);
  }

  async hasAvailableItems(): Promise<boolean> {
    const qtyCount = await this.quantityInputs.count();
    const cbCount = await this.checkboxInputs.count();
    return qtyCount > 0 || cbCount > 0;
  }

  private async waitForCartUpdate() {
    await this.page.waitForLoadState('domcontentloaded');
    if (this.page.url().includes('async_id=')) {
      await this.page.waitForURL(url => !url.searchParams.has('async_id'), {
        waitUntil: 'domcontentloaded',
        timeout: 25000,
      }).catch(() => {});
    }

    await expect.poll(async () => {
      const text = await this.page.locator('body').innerText().catch(() => '');
      const normalizedText = text.toLowerCase();
      const onCheckout = /\/checkout(\/|$|\?)/.test(this.page.url());

      return (
        onCheckout
        || normalizedText.includes('your cart')
        || normalizedText.includes('products have been successfully added to your cart')
        || normalizedText.includes('proceed with checkout')
        || normalizedText.includes('continue with order process')
        || normalizedText.includes('resume checkout')
      );
    }, {
      timeout: 25000,
      intervals: [250, 500, 1000, 2000],
    }).toBe(true);
  }

  private async findProductIndexByPrice(matcher: (price: number) => boolean): Promise<number> {
    const count = await this.productRows.count();

    for (let i = 0; i < count; i++) {
      const rawPrice = await this.productRows.nth(i).getAttribute('data-price');
      const price = Number.parseFloat(rawPrice ?? '');

      if (!Number.isNaN(price) && matcher(price)) {
        return i;
      }
    }

    return -1;
  }
}
