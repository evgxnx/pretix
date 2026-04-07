import type { Page } from "@playwright/test";

const email = () =>
  process.env.PRETIX_CONTROL_EMAIL || "ur pass";
const password = () => process.env.PRETIX_CONTROL_PASSWORD || "ur pass";

export async function loginControl(
  page: Page,
  opts?: { password?: string; nextPath?: string },
) {
  const next = opts?.nextPath ?? "/control/";
  await page.goto(`/control/login?next=${encodeURIComponent(next)}`);
  await page.fill('input[name="email"]', email());
  await page.fill('input[name="password"]', opts?.password ?? password());
  await page.click('button[type="submit"]');
}

export async function gotoCreateEventWizard(page: Page) {
  await loginControl(page);
  await page.waitForURL("**/control/**");
  await page.goto("/control/events/add");
  await page.waitForURL("**/control/events/add");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForSelector('input[name="basics-name_0"]');
}
