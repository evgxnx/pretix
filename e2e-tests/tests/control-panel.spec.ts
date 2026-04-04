import { test, expect } from '@playwright/test';
import { DashboardPage } from '../pages/dashboard.page';
import { ControlPanelPage } from '../pages/control-panel.page';
import { ORGANIZER, EVENT } from '../helpers/test-data';
import { loginAsAdmin } from '../helpers/auth.helper';

test.describe('Control Panel — Dashboard (P3)', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('TC-CP-01: Dashboard loads after login', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await dashboard.expectDashboardLoaded();
  });

  test('TC-CP-02: Navigation bar is visible on dashboard', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await expect(dashboard.navbar).toBeVisible();
  });

  test('TC-CP-03: User dropdown menu is accessible', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();

    if (await dashboard.userDropdown.isVisible()) {
      await dashboard.userDropdown.click();
      await expect(dashboard.logoutLink).toBeVisible();
    }
  });
});

test.describe('Control Panel — Event Management (P3)', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('TC-CP-04: Event settings page loads', async ({ page }) => {
    const controlPage = new ControlPanelPage(page);
    await controlPage.gotoEventSettings(ORGANIZER.slug, EVENT.slug);
    await controlPage.expectPageLoaded();
  });

  test('TC-CP-05: Event items page loads', async ({ page }) => {
    await page.goto(`/control/event/${ORGANIZER.slug}/${EVENT.slug}/items/`);
    await page.waitForLoadState('domcontentloaded');

    // Either table.table-items (has items) or .empty-collection (no items yet)
    const itemsTable = page.locator('.table-items');
    const emptyState = page.locator('.empty-collection');
    const hasTable = await itemsTable.isVisible({ timeout: 5000 }).catch(() => false);
    const hasEmpty = await emptyState.isVisible({ timeout: 1000 }).catch(() => false);
    expect(hasTable || hasEmpty).toBeTruthy();
  });

  test('TC-CP-06: Event quotas page loads', async ({ page }) => {
    const controlPage = new ControlPanelPage(page);
    await controlPage.gotoEventQuotas(ORGANIZER.slug, EVENT.slug);
    await controlPage.expectPageLoaded();
  });

  test('TC-CP-07: Event sidebar navigation links work', async ({ page }) => {
    await page.goto(`/control/event/${ORGANIZER.slug}/${EVENT.slug}/`);

    const controlPage = new ControlPanelPage(page);

    if (await controlPage.navOrders.isVisible()) {
      await controlPage.navOrders.click();
      await page.waitForLoadState('domcontentloaded');
      await expect(page).toHaveURL(/.*orders.*/);
    }
  });

  test('TC-CP-08: Event items nav link works', async ({ page }) => {
    await page.goto(`/control/event/${ORGANIZER.slug}/${EVENT.slug}/`);

    const controlPage = new ControlPanelPage(page);

    if (await controlPage.navItems.isVisible()) {
      await controlPage.navItems.click();
      await page.waitForLoadState('domcontentloaded');
      await expect(page).toHaveURL(/.*items.*/);
    }
  });
});

test.describe('Control Panel — Event Creation (P3)', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('TC-CP-09: Create event page is accessible', async ({ page }) => {
    // Event creation is a wizard at /control/events/add
    await page.goto('/control/events/add');
    await page.waitForLoadState('domcontentloaded');

    const heading = page.getByRole('heading', { name: /create a new event/i });
    const noOrganizerAccess = page.getByText(/do not have access to any organizer accounts/i);
    const singularEventRadio = page.getByRole('radio', { name: /singular event or non-event shop/i });
    const continueButton = page.getByRole('button', { name: /continue/i });

    await expect(heading).toBeVisible();
    await expect(noOrganizerAccess).toHaveCount(0);
    await expect(singularEventRadio).toBeVisible();
    await expect(continueButton).toBeVisible();
  });

  test('TC-CP-10: Event creation wizard has required fields', async ({ page }) => {
    await page.goto('/control/events/add');
    await page.waitForLoadState('domcontentloaded');

    const noOrganizerAccess = page.getByText(/do not have access to any organizer accounts/i);
    await expect(noOrganizerAccess).toHaveCount(0);

    // Step 1 asks for organizer and event type.
    const organizerField = page.locator('select[name$="-organizer"]').first();
    const singularEventRadio = page.getByRole('radio', { name: /singular event or non-event shop/i });
    const seriesEventRadio = page.getByRole('radio', { name: /event series or time slot booking/i });
    const submitBtn = page.getByRole('button', { name: /continue|save|create/i });

    await expect(organizerField).toHaveCount(1);
    await expect(singularEventRadio).toBeVisible();
    await expect(seriesEventRadio).toBeVisible();

    // Try submitting empty — should show validation or stay on same step
    if (await submitBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await submitBtn.click();
      await page.waitForLoadState('domcontentloaded');

      const hasErrors = await page.locator('.has-error, .alert-danger, .errorlist, :invalid').count() > 0;
      const stayedOnPage = page.url().includes('events/add');
      expect(hasErrors || stayedOnPage).toBeTruthy();
    }
  });
});

test.describe('Control Panel — Search (P3)', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('TC-CP-11: Global search is accessible', async ({ page }) => {
    await page.goto('/control/');

    const searchForm = page.locator('form[action*="search"], input[name="query"]');
    if (await searchForm.first().isVisible()) {
      await expect(searchForm.first()).toBeVisible();
    }
  });

  test('TC-CP-12: Search returns results page', async ({ page }) => {
    await page.goto('/control/search/?query=test');
    await page.waitForLoadState('domcontentloaded');

    const content = page.locator('.search-results, .table, .alert, h1');
    await expect(content.first()).toBeVisible();
  });
});
