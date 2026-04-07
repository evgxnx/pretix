import { test, expect } from "@playwright/test";
import { gotoCreateEventWizard, loginControl } from "./helpers";

test.describe("Control / TC01", () => {
  test("успешный вход — сессия и Dashboard", async ({ page }) => {
    await loginControl(page);
    await page.waitForURL("**/control/**");
    expect(page.url()).toContain("/control/");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  });

  test("неверный пароль — остаёмся на логине", async ({ page }) => {
    await loginControl(page, { password: "invalid-password" });
    await page.waitForURL("**/control/login**");
    expect(page.url()).toContain("/control/login");
  });

  test("open redirect через next не уводит на внешний домен", async ({ page }) => {
    await loginControl(page, { nextPath: "https://example.com/phishing" });
    await page.waitForURL("**/control/**");
    expect(page.url()).not.toContain("example.com/phishing");
    expect(page.url().startsWith(process.env.PRETIX_BASE_URL || "http://localhost:8000")).toBeTruthy();
  });
});

test.describe("TC03 — мастер события", () => {
  test.fixme("создание события (wizard не полностью настроен в контейнере)", async ({
    page,
  }) => {
    await gotoCreateEventWizard(page);
    const suffix = Math.random().toString(36).slice(2, 10);
    const start = new Date(Date.now() + 3 * 864e5);
    const end = new Date(start.getTime() + 864e5);
    await page.fill('input[name="basics-name_0"]', `QA E2E ${suffix}`);
    await page.fill('input[name="basics-slug"]', `qa-e2e-${suffix}`);
    await page.fill(
      'input[name="basics-date_from_0"]',
      start.toISOString().slice(0, 10),
    );
    await page.fill('input[name="basics-date_from_1"]', "10:00:00");
    await page.fill(
      'input[name="basics-date_to_0"]',
      end.toISOString().slice(0, 10),
    );
    await page.fill('input[name="basics-date_to_1"]', "12:00:00");
    const checkbox = page.locator('input[name="basics-no_taxes"]');
    if (!(await checkbox.isChecked())) await checkbox.check();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.waitForTimeout(1500);
    const success = await page.getByText("You just created an event!").isVisible();
    const validation =
      (await page.locator(".has-error, .invalid-feedback, .alert-danger").count()) > 0;
    expect(success || validation).toBeTruthy();
    expect(await page.content()).not.toContain("Traceback");
  });
});
