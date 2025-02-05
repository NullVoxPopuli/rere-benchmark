import puppeteer, { type Browser } from 'puppeteer';
import { $ } from 'execa';
import { COUNT, HEADLESS } from './arg.ts';
import { getTests } from './repo.ts';
import { serve } from './serve.ts';
import { addResult } from './results.ts';
import assert from 'node:assert';

const { stdout: chromeLocation } = await $`which google-chrome`;

async function getMarks(browser: Browser, url: string) {
  const page = await browser.newPage();

  await page.goto(url, { waitUntil: 'load' });

  // TODO: is there a way to wait for teh page to caln down?
  await new Promise((resolve) => setTimeout(resolve, 1000));

  const performanceMarks = await page.evaluate(() => {
    return performance.getEntriesByType('mark').map((entry) => ({
      name: entry.name,
      startTime: entry.startTime,
    }));
  });

  page.close();

  return performanceMarks;
}

const url = 'http://localhost:4173'; // Change this to your target URL
let tests = await getTests();

const browser = await puppeteer.launch({
  executablePath: chromeLocation,
  headless: HEADLESS,
});

for (let test of tests) {
  let [, framework, benchName] = test.split('/');

  assert(framework, `Could not determine framework from ${test}`);
  assert(benchName, `Could not determine benchmark from ${test}`);

  console.info(`Framework: ${framework}, ${benchName}`);
  // TODO: make this configurable
  //       - folks could use a different package manager
  //       - different build command
  //       - different output directory
  await $({ preferLocal: true, cwd: test })`pnpm install`;
  await $({ preferLocal: true, cwd: test })`pnpm build`;

  let server = await serve(`${test}/dist`);

  for (let i = 0; i < COUNT; i++) {
    let performanceMarks = await getMarks(browser, url);

    console.log('Performance marks:', performanceMarks);

    await addResult(framework, benchName, performanceMarks);
  }

  server.close();
}

await browser.close();
