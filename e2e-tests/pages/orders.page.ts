import { type Page, type Locator, expect } from '@playwright/test';

export class OrdersPage {
  readonly page: Page;

  // Control panel orders list
  readonly ordersTable: Locator;
  readonly emptyCollection: Locator;
  readonly orderRows: Locator;
  readonly searchInput: Locator;
  readonly searchButton: Locator;
  readonly filterButton: Locator;
  readonly queryInput: Locator;
  readonly statusFilter: Locator;
  readonly orderCodeLinks: Locator;
  readonly paginationNext: Locator;
  readonly exportButton: Locator;

  // Order detail page
  readonly orderStatus: Locator;
  readonly orderCode: Locator;
  readonly orderTotal: Locator;
  readonly orderEmail: Locator;
  readonly cancelButton: Locator;
  readonly refundButton: Locator;
  readonly markPaidButton: Locator;
  readonly resendEmailButton: Locator;
  readonly orderPositions: Locator;
  readonly paymentInfo: Locator;

  // Presale order view
  readonly presaleOrderStatus: Locator;
  readonly presaleOrderCode: Locator;
  readonly downloadTicketButton: Locator;
  readonly modifyOrderLink: Locator;
  readonly cancelOrderLink: Locator;

  constructor(page: Page) {
    this.page = page;

    // Control panel — orders list uses table.table-orders or empty-collection div
    this.ordersTable = page.locator('.table-orders');
    this.emptyCollection = page.locator('.empty-collection');
    this.orderRows = page.locator('.table-orders tbody tr');
    this.searchInput = page.locator('input[name="code"]');
    this.searchButton = page.locator('button[type="submit"]').filter({ hasText: /go/i });
    this.queryInput = page.locator('#id_query');
    this.filterButton = page.locator('button[type="submit"]').filter({ hasText: /filter/i });
    this.statusFilter = page.locator('#id_status');
    this.orderCodeLinks = page.locator('.table-orders tbody tr td a');
    this.paginationNext = page.locator('.pagination .next a, a[rel="next"]');
    this.exportButton = page.locator('a[href*="export"]').first();

    // Order detail (control panel)
    this.orderStatus = page.locator('.label, .badge, .order-status');
    this.orderCode = page.locator('h1, h2').first();
    this.orderTotal = page.locator('.order-total, td:has-text("Total")');
    this.orderEmail = page.locator('td:has-text("@"), .order-email');
    this.cancelButton = page.locator('a[href*="cancel"], button').filter({ hasText: /cancel/i });
    this.refundButton = page.locator('a[href*="refund"], button').filter({ hasText: /refund/i });
    this.markPaidButton = page.locator('button, a').filter({ hasText: /mark as paid|confirm payment/i });
    this.resendEmailButton = page.locator('button, a').filter({ hasText: /resend/i });
    this.orderPositions = page.locator('.order-position, .order-item');
    this.paymentInfo = page.locator('.payment-info, .payment-provider');

    // Presale order view
    this.presaleOrderStatus = page.locator('.alert, .order-status');
    this.presaleOrderCode = page.locator('.order-code');
    this.downloadTicketButton = page.locator('a[href*="download"]').first();
    this.modifyOrderLink = page.locator('a[href*="modify"]');
    this.cancelOrderLink = page.locator('a[href*="cancel"]');
  }

  async gotoControlOrders(organizer: string, event: string) {
    await this.page.goto(`/control/event/${organizer}/${event}/orders/`);
    await this.page.waitForLoadState('domcontentloaded');
  }

  async gotoOrderDetail(organizer: string, event: string, orderCode: string) {
    await this.page.goto(`/control/event/${organizer}/${event}/orders/${orderCode}/`);
  }

  async gotoPresaleOrder(organizer: string, event: string, orderCode: string, secret: string) {
    await this.page.goto(`/${organizer}/${event}/order/${orderCode}/${secret}/`);
  }

  async searchOrder(query: string) {
    await this.searchInput.fill(query);
    await this.searchButton.click();
    await this.page.waitForLoadState('domcontentloaded');
  }

  async expectOrdersPageLoaded() {
    await this.page.waitForLoadState('domcontentloaded');
    const hasTable = await this.ordersTable.isVisible({ timeout: 5000 }).catch(() => false);
    const hasEmpty = await this.emptyCollection.isVisible({ timeout: 1000 }).catch(() => false);
    expect(hasTable || hasEmpty).toBeTruthy();
  }

  async expectOrderDetailLoaded() {
    await expect(this.orderCode).toBeVisible({ timeout: 10000 });
  }

  async hasOrders(): Promise<boolean> {
    return this.ordersTable.isVisible({ timeout: 3000 }).catch(() => false);
  }

  async getOrderCount(): Promise<number> {
    if (await this.hasOrders()) {
      return this.orderRows.count();
    }
    return 0;
  }

  async clickFirstOrder() {
    await this.orderCodeLinks.first().click();
  }

  async expectOrderStatus(status: string) {
    await expect(this.orderStatus.first()).toContainText(new RegExp(status, 'i'));
  }

  async expectPresaleOrderPageLoaded() {
    await expect(this.presaleOrderStatus.first()).toBeVisible({ timeout: 10000 });
  }
}
