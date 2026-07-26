import assert from 'node:assert';
import { join } from 'node:path';

import * as clack from '@clack/prompts';
import { $ } from 'execa';
import puppeteer, { type Browser } from 'puppeteer';

import { COUNT, CPU_THROTTLE, HEADLESS, SKIP_BUILD } from './arg.ts';
import { getBenchInfo } from './bench-info.ts';
import { chromeLocation } from './environment.ts';
import {
  addResult,
  prepareForResults as prepareForResults,
  saveTiming,
} from './results.ts';
import { serve } from './serve.ts';

const info = await getBenchInfo();

interface MarkEntry {
  /**
   * name of the performance.mark
   */
  name: string;
  /**
   * startTime of the perfromance.mark
   */
  at: number;

  /**
   * extra detail from the performance.mark
   *
   * (in the case of the dbmon test, this could be the FPS (for example))
   */
  detail?: unknown;
}

async function getMarks(browser: Browser, url: string) {
  const page = await browser.newPage();

  if (CPU_THROTTLE !== 1) {
    page.emulateCPUThrottling(CPU_THROTTLE);
  }

  await page.goto(url, { waitUntil: 'load' });

  // TODO: is there a way to wait for the page to calmn down?
  await page.waitForNetworkIdle();

  let marks: Array<MarkEntry> = [];

  let remainingWaitTime = 60_000; // 1 minute

  const progress = clack.progress({ style: 'light', max: remainingWaitTime });

  while (remainingWaitTime > 0) {
    const allMarks = await page.evaluate(() => {
      return performance.getEntriesByType('mark').map((entry) => {
        return {
          name: entry.name,
          at: entry.startTime,
          detail: entry.detail,
        };
      });
    });

    if (allMarks.find((m) => m.name === ':done')) {
      progress.stop(`Finished`);
      marks = allMarks.map((entry) => {
        if (!entry.detail) {
          delete entry.detail;
        }

        return entry as MarkEntry;
      });

      break;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
    remainingWaitTime -= 100;
    progress.advance(100);
  }

  page.close();

  if (marks.length === 0) {
    clack.log.warn(`No marks recorded`);
  }

  return marks;
}

const browser = await puppeteer.launch({
  executablePath: chromeLocation,
  headless: HEADLESS,
  defaultViewport: { width: 1280, height: 720 },
  args: ['--window-size=1280,800'],
});

const runStart = Date.now();
let buildMs: number | undefined;

if (!SKIP_BUILD) {
  const buildStart = Date.now();

  clack.log.info(`Building Projects`);

  /**
   * The apps depend on `common` via the link: protocol,
   * and pnpm does not install dependencies *of* linked packages --
   * so without this, every app build fails to resolve
   * `@faker-js/faker` (imported by the dbmon chat-worker,
   * which vite bundles for every app, because common's index
   * imports every test).
   */
  console.info(`Installing dependencies of the linked \`common\` package`);
  await $({ preferLocal: true, cwd: 'common', stdio: 'inherit' })`pnpm install`;

  for (const framework of info.frameworks) {
    for (const app of info.apps) {
      const dir = join('frameworks', framework, app);

      console.info(`Building in ${dir}`);

      // TODO: make this configurable
      //       - folks could use a different package manager
      //       - different build command
      //       - different output directory
      await $({ preferLocal: true, cwd: dir, stdio: 'inherit' })`pnpm install`;
      await $({ preferLocal: true, cwd: dir, stdio: 'inherit' })`pnpm build`;
    }
  }

  buildMs = Date.now() - buildStart;
  clack.log.success('Building Done!');
}

clack.log.info('Starting Benchmark Runs');

const benchmarkStart = Date.now();

/**
 * One server per framework for the app under test, all up at once.
 *
 * That is what lets the sample loop go framework-by-framework *inside* each
 * round rather than running a framework's whole suite before starting the
 * next one. A full suite is many minutes of sustained load, and a CPU that
 * has been at it for ten minutes is not the CPU the first framework was
 * measured on -- thermal headroom and boost residency both drift one way.
 * Grouping by framework turned that drift into a per-framework offset;
 * interleaving spreads it evenly over all of them.
 */
async function serversFor(app: string) {
  const servers = [];

  for (const framework of info.frameworks) {
    const dir = join('frameworks', framework, app);

    clack.log.info(`Starting server for ${framework}/${app} in ${dir}/dist`);

    // port 0: the OS picks a free one, so N frameworks can be up together
    // TODO: make the output directory configurable
    const server = await serve(`${dir}/dist`, 0);
    const address = server.address();

    assert(
      address,
      `Server for ${framework}, (in ${app}) does not have an address!`,
    );

    const url =
      typeof address === 'string'
        ? address
        : `http://${address.address === '::' ? 'localhost' : address.address}:${address.port}`;

    clack.log.info(`  ${framework} up at ${url}`);

    servers.push({ framework, server, url });
  }

  return servers;
}

if (!info.benches) {
  clack.log.error(`No benches selected`);
  process.exit(1);
}

for (const app of info.apps) {
  const servers = await serversFor(app);

  for (const bench of info.benches) {
    if (bench.app !== app) continue;

    for (const variant of info.variants) {
      const name = variant.name ? `${bench.name} ${variant.name}` : bench.name;
      const count = bench.ignoreCount ? 1 : COUNT;

      clack.log.info(`${name}`);

      for (const { framework } of servers) {
        // per variant, under the same name addResult writes to
        await prepareForResults(framework, bench, name, info.filePath);
      }

      for (let i = 0; i < count; i++) {
        clack.log.info(`\tSample ${i + 1} of ${count}`);

        for (const { framework, url } of servers) {
          clack.log.info(`\t\t${framework}`);

          const performanceMarks = await getMarks(
            browser,
            url + '/?' + bench.query + variant.query,
          );

          await addResult(
            framework,
            name,
            performanceMarks,
            info.filePath,
            bench,
          );
        }
      }
    }
  }

  clack.log.info(`Waiting for servers to exit`);

  await Promise.all(
    servers.map(({ server }) => {
      const closed = new Promise((resolve) => server.on('close', resolve));

      // We add this via the killable package
      // @ts-expect-error
      server.kill();

      return closed;
    }),
  );
}

const now = Date.now();
const benchmarkMs = now - benchmarkStart;
const totalMs = now - runStart;

await saveTiming(
  {
    ...(buildMs !== undefined ? { buildMs } : {}),
    benchmarkMs,
    totalMs,
  },
  info.filePath,
);

clack.log.info(
  buildMs !== undefined
    ? `Total: ${(totalMs / 1000).toFixed(1)}s (build: ${(buildMs / 1000).toFixed(1)}s, benchmark: ${(benchmarkMs / 1000).toFixed(1)}s)`
    : `Total: ${(totalMs / 1000).toFixed(1)}s (benchmark only; build skipped)`,
);

await browser.close();
