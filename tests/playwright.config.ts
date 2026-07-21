import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './specs',
  globalSetup: './global-setup.ts',

  timeout: 90_000,
  expect: { timeout: 45_000 },

  /*
   * The benches start via requestAnimationFrame + requestIdleCallback;
   * too many busy pages at once starves idle callbacks in headless
   * chromium and benches never start. Low parallelism + retries keeps
   * this reliable.
   */
  workers: 2,
  retries: 2,

  reporter: process.env.CI ? [['github'], ['list']] : [['list']],

  use: {
    trace: 'retain-on-failure',
  },
});
