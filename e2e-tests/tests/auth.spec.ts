import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { RegisterPage } from '../pages/register.page';
import { DashboardPage } from '../pages/dashboard.page';
import { TEST_ADMIN, NEW_USER } from '../helpers/test-data';

test.describe('Auth Module — Login (P1)', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test('TC-AUTH-01: Login page renders correctly', async () => {
    await loginPage.expectLoginFormVisible();
    await expect(loginPage.forgotPasswordLink).toBeVisible();
  });

  test('TC-AUTH-02: Successful login with valid credentials', async ({ page }) => {
    await loginPage.login(TEST_ADMIN.email, TEST_ADMIN.password);
    await loginPage.expectRedirectedToDashboard();

    const dashboard = new DashboardPage(page);
    await dashboard.expectDashboardLoaded();
  });

  test('TC-AUTH-03: Failed login with wrong password', async () => {
    await loginPage.login(TEST_ADMIN.email, 'wrong_password_123');
    await loginPage.expectErrorVisible();
    await expect(loginPage.page).toHaveURL(/.*login.*/);
  });

  test('TC-AUTH-04: Failed login with non-existent email', async () => {
    await loginPage.login('nonexistent@example.com', 'anyPassword');
    await loginPage.expectErrorVisible();
    await expect(loginPage.page).toHaveURL(/.*login.*/);
  });

  test('TC-AUTH-05: Failed login with empty email', async () => {
    await loginPage.login('', TEST_ADMIN.password);
    await expect(loginPage.page).toHaveURL(/.*login.*/);
  });

  test('TC-AUTH-06: Failed login with empty password', async () => {
    await loginPage.login(TEST_ADMIN.email, '');
    await expect(loginPage.page).toHaveURL(/.*login.*/);
  });

  test('TC-AUTH-07: Failed login with both fields empty', async () => {
    await loginPage.loginButton.click();
    await expect(loginPage.page).toHaveURL(/.*login.*/);
  });

  test('TC-AUTH-08: Login form has CSRF protection', async () => {
    const csrfToken = loginPage.page.locator('input[name="csrfmiddlewaretoken"]');
    await expect(csrfToken).toBeAttached();
    const value = await csrfToken.getAttribute('value');
    expect(value).toBeTruthy();
    expect(value!.length).toBeGreaterThan(10);
  });

  test('TC-AUTH-09: Forgot password link navigates correctly', async () => {
    await loginPage.forgotPasswordLink.click();
    await expect(loginPage.page).toHaveURL(/.*forgot.*/);
  });

  test('TC-AUTH-10: Login with keep me logged in', async ({ page }) => {
    await loginPage.loginWithKeepLoggedIn(TEST_ADMIN.email, TEST_ADMIN.password);
    await loginPage.expectRedirectedToDashboard();
  });
});

test.describe('Auth Module — Registration (P1)', () => {
  let registerPage: RegisterPage;

  test.beforeEach(async ({ page }) => {
    registerPage = new RegisterPage(page);
    await registerPage.goto();
  });

  test('TC-AUTH-11: Registration page renders correctly', async () => {
    await registerPage.expectFormVisible();
    await expect(registerPage.loginLink).toBeVisible();
  });

  test('TC-AUTH-12: Successful registration with valid data', async () => {
    const uniqueEmail = `e2e_${Date.now()}@example.com`;
    await registerPage.register(uniqueEmail, 'SecurePass456!');
    await registerPage.expectRedirectedToDashboard();
  });

  test('TC-AUTH-13: Registration fails with mismatched passwords', async () => {
    await registerPage.registerWithMismatch(
      `mismatch_${Date.now()}@example.com`,
      'Password123!',
      'DifferentPass456!'
    );
    await registerPage.expectErrorVisible();
  });

  test('TC-AUTH-14: Registration fails with invalid email', async () => {
    // Browser HTML5 validation on type="email" blocks submit for invalid emails
    // Verify the email input has type="email" (client-side protection)
    const emailType = await registerPage.emailInput.getAttribute('type');
    expect(emailType).toBe('email');

    // Fill invalid email and verify form does NOT submit (stays on page)
    await registerPage.emailInput.fill('not-an-email');
    await registerPage.passwordInput.fill('SecurePass456!');
    await registerPage.passwordRepeatInput.fill('SecurePass456!');
    await registerPage.registerButton.click();
    await expect(registerPage.page).toHaveURL(/.*register.*/);
  });

  test('TC-AUTH-15: Registration fails with short password', async () => {
    await registerPage.register(`short_${Date.now()}@example.com`, '123');
    await registerPage.expectErrorVisible();
  });

  test('TC-AUTH-16: Registration fails with duplicate email', async () => {
    await registerPage.register(TEST_ADMIN.email, 'SomePassword123!');
    await registerPage.expectErrorVisible();
  });

  test('TC-AUTH-17: Login link on registration page works', async () => {
    await registerPage.loginLink.click();
    await expect(registerPage.page).toHaveURL(/.*login.*/);
  });
});

test.describe('Auth Module — Logout (P1)', () => {
  test('TC-AUTH-18: Successful logout', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(TEST_ADMIN.email, TEST_ADMIN.password);
    await loginPage.expectRedirectedToDashboard();

    const dashboard = new DashboardPage(page);
    await dashboard.logout();
    await dashboard.expectRedirectedToLogin();
  });

  test('TC-AUTH-19: Cannot access dashboard after logout', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(TEST_ADMIN.email, TEST_ADMIN.password);
    await loginPage.expectRedirectedToDashboard();

    const dashboard = new DashboardPage(page);
    await dashboard.logout();
    await dashboard.expectRedirectedToLogin();

    await page.goto('/control/');
    await expect(page).toHaveURL(/.*login.*/);
  });
});

test.describe('Auth Module — Access Control (P1)', () => {
  test('TC-AUTH-20: Unauthenticated user is redirected to login', async ({ page }) => {
    await page.goto('/control/');
    await expect(page).toHaveURL(/.*login.*/);
  });

  test('TC-AUTH-21: Unauthenticated user cannot access event settings', async ({ page }) => {
    await page.goto('/control/event/test-org/test-concert/settings/');
    await expect(page).toHaveURL(/.*login.*/);
  });

  test('TC-AUTH-22: Unauthenticated user cannot access orders', async ({ page }) => {
    await page.goto('/control/event/test-org/test-concert/orders/');
    await expect(page).toHaveURL(/.*login.*/);
  });
});
