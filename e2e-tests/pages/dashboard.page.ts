import { type Page, type Locator, expect } from '@playwright/test';

export class DashboardPage {
  readonly page: Page;
  readonly userDropdown: Locator;
  readonly logoutLink: Locator;
  readonly createEventButton: Locator;
  readonly createOrganizerButton: Locator;
  readonly eventList: Locator;
  readonly searchInput: Locator;
  readonly navbar: Locator;

  constructor(page: Page) {
    this.page = page;
    this.navbar = page.locator('.navbar, nav');
    this.userDropdown = page.locator('.navbar .dropdown-toggle, [data-toggle="dropdown"]').first();
    this.logoutLink = page.locator('a[href*="logout"]');
    this.createEventButton = page.locator('a[href*="create"]').filter({ hasText: /event/i });
    this.createOrganizerButton = page.locator('a[href*="organizer"]').filter({ hasText: /create|new/i });
    this.eventList = page.locator('.event-list, .table');
    this.searchInput = page.locator('input[name="query"], input[type="search"]');
  }

  async goto() {
    await this.page.goto('/control/');
  }

  async expectDashboardLoaded() {
    await expect(this.page).toHaveURL(/.*\/control\/.*/);
    await expect(this.navbar).toBeVisible();
  }

  async logout() {
    await this.userDropdown.click();
    await this.logoutLink.click();
  }

  async expectRedirectedToLogin() {
    await this.page.waitForURL('**/control/login**');
  }

  async navigateToCreateEvent() {
    await this.createEventButton.click();
  }
}
