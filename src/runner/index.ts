import puppeteer, { type Browser } from 'puppeteer';
import * as clack from '@clack/prompts';
import { $ } from 'execa';
import { COUNT, HEADLESS, SKIP_BUILD } from './arg.ts';
import { serve } from './serve.ts';
import {
  addResult,
  prepareForResults as prepareForResults,
} from './results.ts';
import assert from 'node:assert';
import { chromeLocation } from './environment.ts';
import { getBenchInfo } from './bench-info.ts';
import { join } from 'node:path';

let info = await getBenchInfo();

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

  await page.goto(url, { waitUntil: 'load' });

  // TODO: is there a way to wait for the page to calmn down?
  await page.waitForNetworkIdle();

  let marks: Array<MarkEntry> = [];

  let remainingWaitTime = 60_000; // 1 minute

  let progress = clack.progress({ style: 'light', max: remainingWaitTime });
  while (remainingWaitTime > 0) {
    let allMarks = await page.evaluate(() => {
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
});

if (!SKIP_BUILD) {
  clack.log.info(`Building Projects`);
  for (let framework of info.frameworks) {
    for (let app of info.apps) {
      let dir = join('frameworks', framework, app);

      console.info(`Building in ${dir}`);

      // TODO: make this configurable
      //       - folks could use a different package manager
      //       - different build command
      //       - different output directory
      await $({ preferLocal: true, cwd: dir, stdio: 'inherit' })`pnpm install`;
      await $({ preferLocal: true, cwd: dir, stdio: 'inherit' })`pnpm build`;
    }
  }
  clack.log.success('Building Done!');
}

clack.log.info('Starting Benchmark Runs');

for (let framework of info.frameworks) {
  clack.log.info(`Benchmarking ${framework}`);

  /**
   * Iterating on the apps allows us to boot one server for a whose suite of tests
   */
  for (let app of info.apps) {
    let dir = join('frameworks', framework, app);

    clack.log.info(`Starting server for ${app} in ${dir}/dist`);

    // TODO: make the output directory configurable
    let server = await serve(`${dir}/dist`);
    let address = server.address();

    assert(
      address,
      `Server for ${framework}, (in ${app}) does not have an address!`,
    );

    let serverUrl =
      typeof address === 'string'
        ? address
        : `http://${address.address === '::' ? 'localhost' : address.address}:${address.port}`;

    clack.log.info(`Server up at ${serverUrl}`);

    if (!info.benches) {
      clack.log.error(`No benches selected`);
      process.exit(1);
    }

    for (let bench of info.benches) {
      if (bench.app !== app) continue;

      await prepareForResults(framework, bench, info.filePath);

      for (let variant of info.variants) {
        let url = serverUrl + '/?' + bench.query + variant.query;

        clack.log.info(`\tVariant: ${url}`);

        let count = bench.ignoreCount ? 1 : COUNT;
        for (let i = 0; i < count; i++) {
          clack.log.info(`\t\tRemaining: ${count - i}`);
          let performanceMarks = await getMarks(browser, url);

          let name = Boolean(variant.name)
            ? `${bench.name} ${variant.name}`
            : bench.name;

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

    let promise = new Promise((resolve) => {
      server.on('close', resolve);
    });

    // We add this via the killable package
    // @ts-expect-error
    server.kill();

    clack.log.info(`Waiting for server to exit`);
    await promise;
  }
}

await browser.close();
