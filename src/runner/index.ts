import assert from 'node:assert';
import { join } from 'node:path';

import * as clack from '@clack/prompts';
import { $ } from 'execa';
import puppeteer, { type Browser } from 'puppeteer';

import {
  COUNT,
  CPU_THROTTLE,
  HEADLESS,
  printFlagTable,
  SKIP_BUILD,
  TIMEOUT,
} from './arg.ts';
import { getBenchInfo } from './bench-info.ts';
import { chromeLocation, info as environmentInfo } from './environment.ts';
import { serve } from './serve.ts';

import type { BenchmarkInfo } from './benchmarks.ts';
import type { RecordedMark } from './result-file.ts';

printFlagTable();

const info = await getBenchInfo();

const frameCap = HEADLESS ? 60 : environmentInfo.environment.monitor.hz;

function warnIfCapped(
  framework: string,
  bench: BenchmarkInfo,
  marks: RecordedMark[],
) {
  if (bench.measure !== 'fps') return;
  if (!frameCap) return;

  const samples: number[] = [];

  for (const mark of marks) {
    if (mark.name === bench.measure && typeof mark.detail === 'number') {
      samples.push(mark.detail);
    }
  }

  if (samples.length === 0) return;

  const sorted = samples.slice().sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)]!;

  if (median < frameCap * 0.95) return;

  clack.log.warn(
    `${framework}: "${bench.name}" is pinned at the ${frameCap}hz frame cap ` +
      `(median ${median.toFixed(1)} FPS). The page kept up with every frame at ` +
      `--cpu-throttle=${CPU_THROTTLE}, so this sample records the display's ceiling, ` +
      `not the framework's limit. Increase --cpu-throttle until frameworks fall below the cap.`,
  );
}

async function getMarks(browser: Browser, url: string) {
  const page = await browser.newPage();

  if (CPU_THROTTLE !== 1) {
    // awaited: this is a CDP round trip, and an un-awaited one is a
    // floating rejection that could also land after navigation starts
    await page.emulateCPUThrottling(CPU_THROTTLE);
  }

  // a tab that is not the active one gets its rAF throttled, which is the
  // whole measurement on the dbmon bench
  await page.bringToFront();

  await page.goto(url, { waitUntil: 'load' });

  // TODO: is there a way to wait for the page to calmn down?
  await page.waitForNetworkIdle();

  const progress = clack.progress({ style: 'light', max: TIMEOUT });
  // Node-side only: this ticks the bar without touching the page.
  const ticking = setInterval(() => progress.advance(100), 100);

  /**
   * One round trip.
   *
   * This used to `page.evaluate` every 100ms until `:done` showed up, which
   * put a protocol-driven task on the main thread of the page being
   * measured -- and serialized every mark on it -- a few hundred times over
   * a dbmon run, while that run was measuring how well the page keeps up.
   *
   * A PerformanceObserver resolves the moment the mark lands instead, so
   * the page is touched once at the start and once at the end.
   */
  const allMarks = await page.evaluate((budget) => {
    const read = () =>
      performance.getEntriesByType('mark').map((entry) => {
        return {
          name: entry.name,
          at: entry.startTime,
          detail: entry.detail,
        };
      });

    return new Promise<ReturnType<typeof read>>((resolve) => {
      const isDone = () => performance.getEntriesByName(':done').length > 0;

      if (isDone()) return resolve(read());

      const observer = new PerformanceObserver(() => {
        if (!isDone()) return;

        observer.disconnect();
        resolve(read());
      });

      // buffered so a `:done` that landed between `load` and this call is
      // not missed
      observer.observe({ type: 'mark', buffered: true });

      setTimeout(() => resolve(read()), budget);
    });
  }, TIMEOUT);

  clearInterval(ticking);

  const finished = allMarks.some((mark) => mark.name === ':done');

  progress.stop(finished ? `Finished` : `Gave up after ${TIMEOUT}ms`);

  const marks = allMarks.map((entry) => {
    if (!entry.detail) {
      delete entry.detail;
    }

    return entry as RecordedMark;
  });

  await page.close();

  /**
   * A sample that never reached `:done` is not a slow sample, it is a
   * broken one -- the page throws on its own after 30s if the DOM never
   * settles, so getting here means something worse.
   *
   * It used to be recorded anyway, as an entry with no `:done` in it. The
   * results app skips those with a `console.warn` nobody reads, so a run
   * could quietly summarize 7 samples while claiming 10, and a run where
   * every sample failed produced NaN. Stopping is louder and cheaper than
   * discovering it later; whatever completed before this point is already
   * in the results file.
   */
  if (!finished) {
    throw new Error(
      `No :done mark after ${TIMEOUT}ms at ${url}\n` +
        `Recorded marks: ${marks.map((mark) => mark.name).join(', ') || '(none)'}`,
    );
  }

  return marks;
}

const browser = await puppeteer.launch({
  executablePath: chromeLocation,
  headless: HEADLESS,
  defaultViewport: { width: 1280, height: 720 },
  args: [
    '--window-size=1280,800',
    /**
     * Chrome throttles timers, backgrounds renderers, and drops
     * requestAnimationFrame to a crawl for windows it thinks nobody is
     * looking at. Headed runs are the default here, so anything the user
     * puts in front of the benchmark window -- or any occlusion at all --
     * would otherwise land in the results as a slow framework.
     */
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    /**
     * A profile-wide first-run/default-browser prompt, and any extension,
     * is work the benchmark did not ask for.
     */
    '--disable-extensions',
    '--no-default-browser-check',
    '--no-first-run',
  ],
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

for (const framework of info.frameworks) {
  clack.log.info(`Benchmarking ${framework}`);

  /**
   * Iterating on the apps allows us to boot one server for a whose suite of tests
   */
  for (const app of info.apps) {
    const dir = join('frameworks', framework, app);

    clack.log.info(`Starting server for ${app} in ${dir}/dist`);

    // TODO: make the output directory configurable
    const server = await serve(`${dir}/dist`);
    const address = server.address();

    assert(
      address,
      `Server for ${framework}, (in ${app}) does not have an address!`,
    );

    const serverUrl =
      typeof address === 'string'
        ? address
        : `http://${address.address === '::' ? 'localhost' : address.address}:${address.port}`;

    clack.log.info(`Server up at ${serverUrl}`);

    if (!info.benches) {
      clack.log.error(`No benches selected`);
      process.exit(1);
    }

    for (const bench of info.benches) {
      if (bench.app !== app) continue;

      await info.file.prepareFor(framework, bench);

      for (const variant of info.variants) {
        const url = serverUrl + '/?' + bench.query + variant.query;

        clack.log.info(`\tVariant: ${url}`);

        const count = bench.ignoreCount ? 1 : COUNT;

        for (let i = 0; i < count; i++) {
          clack.log.info(`\t\tRemaining: ${count - i}`);

          const performanceMarks = await getMarks(browser, url);

          warnIfCapped(framework, bench, performanceMarks);

          const name = variant.name
            ? `${bench.name} ${variant.name}`
            : bench.name;

          await info.file.addResult(framework, name, performanceMarks, bench);
        }
      }
    }

    const promise = new Promise((resolve) => {
      server.on('close', resolve);
    });

    server.kill();

    clack.log.info(`Waiting for server to exit`);
    await promise;
  }
}

const now = Date.now();
const benchmarkMs = now - benchmarkStart;
const totalMs = now - runStart;

await info.file.saveTiming({
  ...(buildMs !== undefined ? { buildMs } : {}),
  benchmarkMs,
  totalMs,
});

clack.log.info(
  buildMs !== undefined
    ? `Total: ${(totalMs / 1000).toFixed(1)}s (build: ${(buildMs / 1000).toFixed(1)}s, benchmark: ${(benchmarkMs / 1000).toFixed(1)}s)`
    : `Total: ${(totalMs / 1000).toFixed(1)}s (benchmark only; build skipped)`,
);

await browser.close();
