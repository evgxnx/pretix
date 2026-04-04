import { type Page, type Locator, expect } from '@playwright/test';

export class CheckoutPage {
  readonly page: Page;
  readonly checkoutSteps: Locator;
  readonly activeStep: Locator;
  readonly nextButton: Locator;
  readonly prevButton: Locator;
  readonly emailInput: Locator;
  readonly confirmButton: Locator;
  readonly orderConfirmation: Locator;
  readonly cartTable: Locator;
  readonly totalPrice: Locator;
  readonly errorMessages: Locator;
  readonly invalidFields: Locator;

  // Contact form fields
  readonly contactEmailInput: Locator;
  readonly contactPhoneInput: Locator;

  // Invoice address fields
  readonly companyInput: Locator;
  readonly nameInput: Locator;
  readonly streetInput: Locator;
  readonly zipCodeInput: Locator;
  readonly cityInput: Locator;
  readonly countrySelect: Locator;

  // Payment method
  readonly paymentMethods: Locator;

  constructor(page: Page) {
    this.page = page;
    this.checkoutSteps = page.locator('.checkout-step, .checkout-flow li');
    this.activeStep = page.locator('.checkout-step.active, .checkout-flow li.active').or(
      page.getByText(/^Current:/i)
    );
    this.nextButton = page.getByRole('button', { name: /continue|next|proceed|place order|submit|confirm/i });
    this.prevButton = page.locator('a.btn').filter({ hasText: /back|prev/i });
    this.emailInput = page.locator('#id_email');
    this.confirmButton = page.getByRole('button', { name: /place binding order|submit registration|place order/i });
    this.orderConfirmation = page.locator('.thank-you, .alert-success, [class*="order-code"]');
    this.cartTable = page.locator('.cart-table, .table');
    this.totalPrice = page.locator('.cart-total, .total-price, .cart-sum');
    this.errorMessages = page.locator('.alert-danger, .has-error, .errorlist');
    this.invalidFields = page.locator(':invalid');

    this.contactEmailInput = page.locator('#id_email');
    this.contactPhoneInput = page.locator('#id_phone, input[name*="phone"]');

    this.companyInput = page.locator('#id_company, input[name="company"]');
    this.nameInput = page.locator('input[name*="name_parts"], #id_name_parts_0, #id_name');
    this.streetInput = page.locator('#id_street, input[name="street"]');
    this.zipCodeInput = page.locator('#id_zipcode, input[name="zipcode"]');
    this.cityInput = page.locator('#id_city, input[name="city"]');
    this.countrySelect = page.locator('#id_country, select[name="country"]');

    this.paymentMethods = page.locator('input[name="payment"]');
  }

  async goto(organizer: string, event: string) {
    await this.page.goto(`/${organizer}/${event}/checkout/start`);
  }

  async fillContactInfo(email: string, phone?: string) {
    await this.contactEmailInput.fill(email);
    if (phone && await this.contactPhoneInput.isVisible()) {
      await this.contactPhoneInput.fill(phone);
    }
  }

  async fillInvoiceAddress(data: {
    name?: string;
    company?: string;
    street?: string;
    zipcode?: string;
    city?: string;
    country?: string;
  }) {
    if (data.name && await this.nameInput.isVisible()) {
      await this.nameInput.first().fill(data.name);
    }
    if (data.company && await this.companyInput.isVisible()) {
      await this.companyInput.fill(data.company);
    }
    if (data.street && await this.streetInput.isVisible()) {
      await this.streetInput.fill(data.street);
    }
    if (data.zipcode && await this.zipCodeInput.isVisible()) {
      await this.zipCodeInput.fill(data.zipcode);
    }
    if (data.city && await this.cityInput.isVisible()) {
      await this.cityInput.fill(data.city);
    }
    if (data.country && await this.countrySelect.isVisible()) {
      await this.countrySelect.selectOption(data.country);
    }
  }

  async selectPaymentMethod(index: number = 0) {
    const method = this.paymentMethods.nth(index);
    if (await method.isVisible()) {
      await method.check();
    }
  }

  async proceedToNext() {
    const currentUrl = this.page.url();
    const currentStep = await this.getCurrentStepName();

    await expect(this.nextButton.first()).toBeVisible();
    await this.nextButton.first().click();
    await this.page.waitForLoadState('domcontentloaded');

    await expect.poll(async () => {
      const stepChanged = (await this.getCurrentStepName()) !== currentStep;
      const urlChanged = this.page.url() !== currentUrl;
      const paymentVisible = await this.paymentMethods.first().isVisible({ timeout: 250 }).catch(() => false);
      const errorsVisible = await this.errorMessages.first().isVisible({ timeout: 250 }).catch(() => false);
      const invalidFieldVisible = await this.invalidFields.first().isVisible({ timeout: 250 }).catch(() => false);
      const hasNativeValidationMessage = await this.page.evaluate(() => {
        const invalid = document.querySelector(':invalid') as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null;
        return Boolean(invalid?.validationMessage);
      }).catch(() => false);

      return stepChanged || urlChanged || paymentVisible || errorsVisible || invalidFieldVisible || hasNativeValidationMessage;
    }, {
      timeout: 5000,
      intervals: [250, 500, 1000],
    }).toBe(true);
  }

  async confirmOrder() {
    await this.confirmButton.click();
    await this.page.waitForLoadState('domcontentloaded');
  }

  async expectCheckoutPageLoaded() {
    await expect(this.page).toHaveURL(/.*checkout.*/);
  }

  async expectOrderConfirmed() {
    await expect(this.orderConfirmation).toBeVisible({ timeout: 15000 });
  }

  async expectErrorDisplayed() {
    await expect(this.errorMessages.first()).toBeVisible();
  }

  async getCurrentStepName(): Promise<string> {
    const text = await this.activeStep.first().textContent({ timeout: 1000 }).catch(() => '');
    return text.replace(/^Current:\s*/i, '').trim();
  }
}
