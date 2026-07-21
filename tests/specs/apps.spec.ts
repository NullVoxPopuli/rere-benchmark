import { join } from 'node:path';

import { test, expect, type Page } from '@playwright/test';

import {
  FRAMEWORKS,
  BENCHES,
  appDir,
  serveDist,
  startDevServer,
  type BenchSpec,
} from '../helpers';

function collectPageErrors(page: Page): string[] {
  const errors: string[] = [];

  page.on('pageerror', (error) => errors.push(error.message));

  return errors;
}

async function expectBenchCompletes(
  page: Page,
  bench: BenchSpec,
  errors: string[],
) {
  if (bench.completion === 'done-mark') {
    /*
     * Every non-continuous bench self-verifies its rendered DOM
     * (common/src/tests/utils.js tryVerify): a `:done` performance mark
     * on success, a thrown error (-> pageerror) on failure.
     */
    await page.waitForFunction(
      () => performance.getEntriesByName(':done', 'mark').length > 0,
      undefined,
      {
        timeout: 60_000,
      },
    );

    if (bench.expectText) {
      await expect(page.locator('body')).toContainText(bench.expectText);
    }
  } else {
    // dbmon runs forever: assert both data streams render and keep updating
    await expect
      .poll(() => page.locator('tbody tr').count(), { timeout: 30_000 })
      .toBeGreaterThan(0);
    await expect
      .poll(() => page.locator('.chat').count(), { timeout: 30_000 })
      .toBeGreaterThan(0);

    const sample = () => page.locator('tbody tr').first().innerText();
    const before = await sample();

    await expect.poll(sample, { timeout: 30_000 }).not.toBe(before);
  }

  expect(errors, 'no uncaught errors on the page').toEqual([]);
}

for (const framework of FRAMEWORKS) {
  for (const bench of BENCHES) {
    test(`${framework} / ${bench.app}`, async ({ page }) => {
      const server = await serveDist(
        join(appDir(framework, bench.app), 'dist'),
      );

      try {
        const errors = collectPageErrors(page);

        await page.goto(`${server.url}/${bench.query}`);
        await expectBenchCompletes(page, bench, errors);
      } finally {
        await server.close();
      }
    });
  }
}

/*
 * dbmon is the only bench that loads raw assets (web workers, css) from
 * the linked `common` package, which only vite dev serves via /@fs and
 * can 403 (server.fs.allow). Prod builds bundle these, so only a dev
 * server catches that class of breakage.
 */
const DEV_PORT_BASE = 4650;

for (const [index, framework] of FRAMEWORKS.entries()) {
  test(`${framework} / dbmon-with-chat (vite dev)`, async ({ page }) => {
    const dev = await startDevServer(
      appDir(framework, 'dbmon-with-chat'),
      DEV_PORT_BASE + index,
    );

    try {
      const errors = collectPageErrors(page);
      const blocked: string[] = [];

      page.on('response', (response) => {
        // favicon is cosmetic; not every app declares one
        if (response.status() >= 400 && !response.url().includes('favicon')) {
          blocked.push(`${response.status()} ${response.url()}`);
        }
      });

      await page.goto(dev.url);
      await expectBenchCompletes(page, BENCHES[0]!, errors);

      expect(
        blocked,
        'no 4xx/5xx responses (e.g. fs.allow blocking common)',
      ).toEqual([]);
    } finally {
      await dev.stop();
    }
  });
}
