import { type Page, type Locator, expect } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly keepLoggedInCheckbox: Locator;
  readonly forgotPasswordLink: Locator;
  readonly registerLink: Locator;
  readonly errorAlert: Locator;
  readonly form: Locator;

  constructor(page: Page) {
    this.page = page;
    this.form = page.locator('form.form-signin');
    this.emailInput = page.locator('#id_email');
    this.passwordInput = page.locator('#id_password');
    this.loginButton = page.locator('button[type="submit"]');
    this.keepLoggedInCheckbox = page.locator('#id_keep_logged_in');
    this.forgotPasswordLink = page.locator('a[href*="forgot"]');
    this.registerLink = page.locator('a[href*="register"]');
    this.errorAlert = page.locator('.alert-danger, .has-error, .errorlist');
  }

  async goto() {
    for (let attempt = 0; attempt < 3; attempt++) {
      await this.page.goto('/control/login');
      await this.page.waitForLoadState('domcontentloaded');

      if (await this.form.isVisible({ timeout: 3000 }).catch(() => false)) {
        return;
      }

      const badGatewayHeading = this.page.getByRole('heading', { name: /502 bad gateway/i });
      const isBadGateway = await badGatewayHeading.isVisible({ timeout: 1000 }).catch(() => false);

      if (!isBadGateway || attempt === 2) {
        return;
      }

      await this.page.waitForTimeout(1000 * (attempt + 1));
    }
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  async loginWithKeepLoggedIn(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    if (await this.keepLoggedInCheckbox.isVisible()) {
      await this.keepLoggedInCheckbox.check();
    }
    await this.loginButton.click();
  }

  async expectLoginFormVisible() {
    await expect(this.form).toBeVisible();
    await expect(this.emailInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.loginButton).toBeVisible();
  }

  async expectErrorVisible() {
    await expect(this.errorAlert).toBeVisible();
  }

  async expectRedirectedToDashboard() {
    const isDashboardUrl = (url: URL) => {
      return url.pathname.startsWith('/control/') && !url.pathname.startsWith('/control/login');
    };

    if (!isDashboardUrl(new URL(this.page.url()))) {
      await this.page.waitForURL(isDashboardUrl, {
        waitUntil: 'commit',
        timeout: 10000,
      });
    }

    await expect(this.page).not.toHaveURL(/.*\/control\/login.*/);
  }
}
