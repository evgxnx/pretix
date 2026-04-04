import { type Page, type Locator, expect } from '@playwright/test';
import { gotoWithRetry } from '../helpers/navigation.helper';

export class ControlPanelPage {
  readonly page: Page;

  // Event creation
  readonly eventNameInput: Locator;
  readonly eventSlugInput: Locator;
  readonly eventDateFrom: Locator;
  readonly eventDateTo: Locator;
  readonly eventCurrency: Locator;
  readonly eventTimezone: Locator;
  readonly saveButton: Locator;

  // Item management
  readonly addItemButton: Locator;
  readonly itemNameInput: Locator;
  readonly itemPriceInput: Locator;
  readonly itemActiveCheckbox: Locator;
  readonly itemsTable: Locator;
  readonly itemRows: Locator;

  // Quota management
  readonly addQuotaButton: Locator;
  readonly quotaNameInput: Locator;
  readonly quotaSizeInput: Locator;
  readonly quotaItemsSelect: Locator;
  readonly quotasTable: Locator;

  // Navigation
  readonly navOrders: Locator;
  readonly navItems: Locator;
  readonly navSettings: Locator;
  readonly navQuotas: Locator;

  // Organizer
  readonly organizerNameInput: Locator;
  readonly organizerSlugInput: Locator;

  constructor(page: Page) {
    this.page = page;

    // Event form
    this.eventNameInput = page.locator('input[name*="name"]').first();
    this.eventSlugInput = page.locator('input[name="slug"]');
    this.eventDateFrom = page.locator('input[name*="date_from"]').first();
    this.eventDateTo = page.locator('input[name*="date_to"]').first();
    this.eventCurrency = page.locator('select[name="currency"]');
    this.eventTimezone = page.locator('select[name="timezone"]');
    this.saveButton = page.locator('button[type="submit"]').filter({ hasText: /save|create|next/i });

    // Items
    this.addItemButton = page.locator('a[href*="item/add"], a[href*="items/add"]');
    this.itemNameInput = page.locator('input[name*="name"]').first();
    this.itemPriceInput = page.locator('input[name="default_price"]');
    this.itemActiveCheckbox = page.locator('input[name="active"]');
    this.itemsTable = page.locator('.table');
    this.itemRows = page.locator('table tbody tr');

    // Quotas
    this.addQuotaButton = page.locator('a[href*="quota/add"], a[href*="quotas/add"]');
    this.quotaNameInput = page.locator('input[name="name"]');
    this.quotaSizeInput = page.locator('input[name="size"]');
    this.quotaItemsSelect = page.locator('select[name="items"]');
    this.quotasTable = page.locator('.table');

    // Navigation sidebar
    this.navOrders = page.locator('a[href*="/orders/"]').first();
    this.navItems = page.locator('a[href*="/items/"]').first();
    this.navSettings = page.locator('a[href*="/settings/"]').first();
    this.navQuotas = page.locator('a[href*="/quotas/"]').first();

    // Organizer
    this.organizerNameInput = page.locator('input[name*="name"]').first();
    this.organizerSlugInput = page.locator('input[name="slug"]');
  }

  async gotoCreateEvent() {
    await gotoWithRetry(this.page, '/control/events/add');
  }

  async gotoEventItems(organizer: string, event: string) {
    await gotoWithRetry(this.page, `/control/event/${organizer}/${event}/items/`);
  }

  async gotoEventQuotas(organizer: string, event: string) {
    await gotoWithRetry(this.page, `/control/event/${organizer}/${event}/quotas/`);
  }

  async gotoEventSettings(organizer: string, event: string) {
    await gotoWithRetry(this.page, `/control/event/${organizer}/${event}/settings/`);
  }

  async gotoCreateOrganizer() {
    await gotoWithRetry(this.page, '/control/organizers/add');
  }

  async createOrganizer(name: string, slug: string) {
    await this.organizerNameInput.fill(name);
    await this.organizerSlugInput.fill(slug);
    await this.saveButton.click();
    await this.page.waitForLoadState('domcontentloaded');
  }

  async expectPageLoaded() {
    await expect(this.page).toHaveURL(/.*\/control\/.*/);
  }

  async expectSuccessMessage() {
    await expect(this.page.locator('.alert-success')).toBeVisible({ timeout: 10000 });
  }
}
