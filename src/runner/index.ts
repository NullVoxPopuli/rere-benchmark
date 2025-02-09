import puppeteer, { type Browser } from 'puppeteer';
import { $ } from 'execa';
import { COUNT, HEADLESS } from './arg.ts';
import { getTests } from './repo.ts';
import { serve } from './serve.ts';
import { info, addResult, filePath, clearPriorResults } from './results.ts';
import assert from 'node:assert';
import * as clack from '@clack/prompts';
import { chromeLocation } from './environment.ts';
import { inspect } from 'node:util';

console.info(inspect(info, { showHidden: false, depth: null, colors: true }));
console.log(`
  Results will be written to ${filePath}
`);

let letsgo = await clack.confirm({
  message: 'Does this information look correct?',
});

if (!letsgo || clack.isCancel(letsgo)) {
  clack.log.info('Exiting');
  process.exit(1);
}

async function getMarks(browser: Browser, url: string) {
  const page = await browser.newPage();

  await page.goto(url, { waitUntil: 'load' });

  // TODO: is there a way to wait for the page to calmn down?
  await page.waitForNetworkIdle();
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

let tests = await getTests();

const browser = await puppeteer.launch({
  executablePath: chromeLocation,
  headless: HEADLESS,
});

console.log(`Running ${tests.length} tests...`);

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

  await clearPriorResults(framework, benchName);

  let server = await serve(`${test}/dist`);
  let address = server.address();

  assert(
    address,
    `Server for ${framework}, ${benchName} does not have an address!`,
  );

  let url =
    typeof address === 'string'
      ? address
      : `http://${address.address === '::' ? 'localhost' : address.address}:${address.port}`;

  console.log(`${framework} w/ ${benchName} up at ${url}`);

  for (let i = 0; i < COUNT; i++) {
    let performanceMarks = await getMarks(browser, url);

    console.log('Performance marks:', performanceMarks);

    await addResult(framework, benchName, performanceMarks);
  }

  let promise = new Promise((resolve) => {
    server.on('close', resolve);
  });

  // We add this via the killable package
  // @ts-expect-error
  server.kill();

  console.log(`Waiting for server to exit`);
  await promise;
}

await browser.close();
