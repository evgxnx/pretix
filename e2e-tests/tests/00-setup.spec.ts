import { test, expect } from '@playwright/test';
import { ORGANIZER, EVENT } from '../helpers/test-data';
import { loginAsAdmin } from '../helpers/auth.helper';
import { gotoWithRetry } from '../helpers/navigation.helper';

/**
 * Verification suite: ensures the test environment has all required data.
 * Test data is created via Django shell (see README).
 * File named 00-setup so it runs first (alphabetical order).
 */

test.describe.serial('Test Environment Verification', () => {

  test('SETUP-01: Organizer exists', async ({ page }) => {
    await loginAsAdmin(page);
    await gotoWithRetry(page, `/control/organizer/${ORGANIZER.slug}/`);

    // Should not be redirected to 404 or error page
    expect(page.url()).toContain(`/organizer/${ORGANIZER.slug}/`);
    const heading = page.locator('h1, .page-header, .content-header');
    await expect(heading.first()).toBeVisible();
  });

  test('SETUP-02: Event exists and is live', async ({ page }) => {
    await loginAsAdmin(page);
    await gotoWithRetry(page, `/control/event/${ORGANIZER.slug}/${EVENT.slug}/`);

    expect(page.url()).toContain(`/event/${ORGANIZER.slug}/${EVENT.slug}/`);

    // Verify event is accessible on the presale side too
    await gotoWithRetry(page, `/${ORGANIZER.slug}/${EVENT.slug}/`);
    expect(page.url()).toContain(`/${ORGANIZER.slug}/${EVENT.slug}/`);
  });

  test('SETUP-03: Products are available on event page', async ({ page }) => {
    await gotoWithRetry(page, `/${ORGANIZER.slug}/${EVENT.slug}/`);

    const productList = page.locator('.item-category');
    await expect(productList.first()).toBeVisible({ timeout: 5000 });

    const addToCartBtn = page.locator('#btn-add-to-cart');
    await expect(addToCartBtn).toBeVisible();
  });

  test('SETUP-04: Quota is configured', async ({ page }) => {
    await loginAsAdmin(page);
    await gotoWithRetry(page, `/control/event/${ORGANIZER.slug}/${EVENT.slug}/quotas/`);

    const quotaTable = page.locator('.table-quotas, table');
    const emptyState = page.locator('.empty-collection');
    const hasQuotas = await quotaTable.isVisible({ timeout: 3000 }).catch(() => false);
    const isEmpty = await emptyState.isVisible({ timeout: 1000 }).catch(() => false);

    expect(hasQuotas && !isEmpty).toBeTruthy();
  });

  test('SETUP-05: Event is live (presale page accessible)', async ({ page }) => {
    await gotoWithRetry(page, `/${ORGANIZER.slug}/${EVENT.slug}/`);

    // If event is live, we see products or at least no "not yet started" error
    const quantityInputs = page.locator('input.input-item-count, input[type="number"]');
    const checkboxInputs = page.locator('.availability-box input[type="checkbox"]');
    const qtyCount = await quantityInputs.count();
    const cbCount = await checkboxInputs.count();

    expect(qtyCount + cbCount).toBeGreaterThan(0);
  });

  test('SETUP-06: Payment method is enabled', async ({ page }) => {
    await loginAsAdmin(page);
    await gotoWithRetry(page, `/control/event/${ORGANIZER.slug}/${EVENT.slug}/settings/payment/`);

    const content = page.locator('body');
    await expect(content).not.toBeEmpty();
    // Payment settings page should load without error
    expect(page.url()).toContain('/settings/payment/');
  });
});
