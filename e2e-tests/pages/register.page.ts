import { type Page, type Locator, expect } from '@playwright/test';

export class RegisterPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly passwordRepeatInput: Locator;
  readonly registerButton: Locator;
  readonly loginLink: Locator;
  readonly form: Locator;
  readonly errorAlert: Locator;

  constructor(page: Page) {
    this.page = page;
    this.form = page.locator('form.form-signin');
    this.emailInput = page.locator('#id_email');
    this.passwordInput = page.locator('#id_password');
    this.passwordRepeatInput = page.locator('#id_password_repeat');
    this.registerButton = page.locator('button[type="submit"]');
    this.loginLink = page.locator('a.btn[href*="login"]');
    this.errorAlert = page.locator('.alert-danger, .has-error, .errorlist');
  }

  async goto() {
    await this.page.goto('/control/register');
  }

  async register(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.passwordRepeatInput.fill(password);
    await this.registerButton.click();
  }

  async registerWithMismatch(email: string, password: string, passwordRepeat: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.passwordRepeatInput.fill(passwordRepeat);
    await this.registerButton.click();
  }

  async expectFormVisible() {
    await expect(this.form).toBeVisible();
    await expect(this.emailInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.passwordRepeatInput).toBeVisible();
  }

  async expectErrorVisible() {
    await expect(this.errorAlert).toBeVisible();
  }

  async expectRedirectedToDashboard() {
    await this.page.waitForURL('**/control/**');
    await expect(this.page).not.toHaveURL(/.*register.*/);
  }
}
