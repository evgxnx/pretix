import { type Page } from '@playwright/test';

async function isInternalServerErrorPage(page: Page) {
  const errorHeading = page.getByRole('heading', { name: /^internal server error$/i });
  return errorHeading.isVisible({ timeout: 500 }).catch(() => false);
}

export async function gotoWithRetry(page: Page, url: string) {
  let lastError: unknown;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await page.goto(url, { waitUntil: 'commit' });
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      const isTransientAbort = message.includes('ERR_ABORTED') || message.includes('frame was detached');

      if (page.isClosed()) {
        throw error;
      }

      if (!isTransientAbort || attempt === 2) {
        throw error;
      }
    }

    if (page.isClosed()) {
      throw lastError;
    }

    await page.waitForLoadState('domcontentloaded').catch(() => {});

    const targetReached = page.url().includes(url);
    const hasInternalServerError = await isInternalServerErrorPage(page);

    if (targetReached && !hasInternalServerError) {
      return;
    }

    if (attempt === 2) {
      if (hasInternalServerError) {
        throw new Error(`Internal Server Error while navigating to ${url}`);
      }
      throw lastError instanceof Error ? lastError : new Error(`Failed to navigate to ${url}`);
    }
  }
}
