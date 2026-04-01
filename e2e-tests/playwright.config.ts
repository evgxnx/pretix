import { defineConfig, devices } from '@playwright/test';

/**
 * Pretix E2E Test Configuration
 *
 * BASE_URL should point to a running pretix instance.
 * Default: http://localhost:8000 (local dev server)
 *
 * Start pretix locally:
 *   cd pretix/src && python manage.py runserver
 */
export default defineConfig({
  testDir: './tests',
  globalSetup: './global.setup.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:8000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'en-US',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
