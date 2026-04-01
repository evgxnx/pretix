import { type Page, expect } from '@playwright/test';
import { gotoWithRetry } from './navigation.helper';
import { LoginPage } from '../pages/login.page';

async function login(page: Page, email: string, password: string) {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login(email, password);
  await loginPage.expectRedirectedToDashboard();
}

async function ensureStaffSession(page: Page, password: string) {
  const endAdminSessionLink = page.getByRole('link', { name: /end admin session/i });

  if (await endAdminSessionLink.isVisible({ timeout: 1000 }).catch(() => false)) {
    return;
  }

  const adminModeButton = page
    .getByRole('button', { name: /admin mode/i })
    .or(page.getByRole('link', { name: /admin mode/i }));

  if (await adminModeButton.first().isVisible({ timeout: 1000 }).catch(() => false)) {
    await adminModeButton.first().click();
    await page.waitForLoadState('domcontentloaded');
  }

  if (await endAdminSessionLink.isVisible({ timeout: 1000 }).catch(() => false)) {
    return;
  }

  // Reauth — confirm password
  await gotoWithRetry(page, '/control/reauth/');

  const passwordForm = page.locator('form:has(#id_password)');
  const passwordField = passwordForm.locator('#id_password');
  if (await passwordField.isVisible({ timeout: 3000 }).catch(() => false)) {
    await passwordField.fill(password);
    await Promise.all([
      page.waitForLoadState('domcontentloaded'),
      passwordForm.locator('button[type="submit"]').click(),
    ]);
  }

  // Start staff session (sudo mode)
  await gotoWithRetry(page, '/control/sudo/');

  const startBtn = page
    .getByRole('button', { name: /continue|start session/i })
    .or(page.locator('form button[type="submit"]'));
  if (await startBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await Promise.all([
      page.waitForLoadState('domcontentloaded'),
      startBtn.click(),
    ]);
  }

  // Do not return while the staff-session navigation is still settling.
  await expect(endAdminSessionLink).toBeVisible({ timeout: 5000 });
}

export async function loginAsAdmin(page: Page) {
  await login(page, 'admin@localhost', 'admin');
  await ensureStaffSession(page, 'admin');
}

export async function loginAsUser(page: Page, email: string, password: string) {
  await login(page, email, password);
}

/**
 * Login + activate staff (sudo) session.
 * Required for: creating organizers, global settings, etc.
 */
export async function loginAsAdminWithStaffSession(page: Page) {
  await loginAsAdmin(page);
}

export async function getCSRFToken(page: Page): Promise<string> {
  return page.locator('input[name="csrfmiddlewaretoken"]').getAttribute('value') as Promise<string>;
}
