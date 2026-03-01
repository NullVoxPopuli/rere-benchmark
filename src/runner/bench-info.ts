import assert from 'node:assert';
import { readdir } from 'node:fs/promises';
import { inspect } from 'node:util';

import * as clack from '@clack/prompts';

import * as args from './arg.ts';
import { yyyymmdd } from './environment.ts';
import { frameworks } from './repo.ts';
import { info, saveBenchmarkInfo } from './results.ts';

export interface BenchmarkInfo {
  /**
   * The benchmark name.
   */
  name: string;
  /**
   * The name of the app to launch.
   * Every framework must have a matching app name
   * for each benchmark.
   */
  app: string;
  /**
   * Configuration passed to the benchmark via query params
   */
  query: string;
  /**
   * Certain benchmarks intended to have observation, such as the dbmon bench -- where we take FPS samples of sliding window averages.
   *
   * Most benchmarks though will start a task and measure the time to completion of that task.
   *
   * The dbmon bench doesn't have completion,
   * as instead of measuring "duration of a task",
   * we are measuring "responsiveness" of the web page.
   */
  ignoreCount?: boolean;
  /**
   * All benchmarks emit a :start and :done mark.
   * But for some benchmarks, we don't care about those,
   * and instead want a different measurement.
   *
   * This option tells us which mark names to use for measurement.
   * and when doing so, we'll use the "detail", instead of the at/startTime
   *
   */
  measure?: string;

  /**
   * For the measured value, assume smaller values are better unless this is set to bigger.
   */
  whatsBetter: 'bigger' | 'smaller';

  /**
   * What units are measured? this will be displayed in the UI
   */
  units: string;
}

const variants = [
  // Batching is a fair (low-level) technique, but I don't know if I want it always present.
  // We'll see if I change my mind when Solid v2 comes out.
  //
  // I don't think users should have to think about whether or not to use batching.
  // This is why by defaultl it is "off"
  { name: '', query: '' },
  // { name: 'w/ manual batching', query: '&manualBatch=true' },
];

const randomAwaitChance = 100;

/**
 * TODO: make the bigger is better benchmark mutually exclusive
 *       to the smaller is better benchmarks
 */
const benchmarks: BenchmarkInfo[] = [
  {
    name: 'DB Monitor w/ chat simulation',
    app: 'dbmon-with-chat',
    query: '',
    // This is a long running bench which we'll be taking multiple samples from
    ignoreCount: true,
    measure: 'fps',
    whatsBetter: 'bigger',
    units: 'FPS',
  },
  {
    name: '1 item, 1k updates (async)',
    app: 'one-item-many-updates',
    query: `&updates=1000&percentRandomAwait=${randomAwaitChance}`,
    whatsBetter: 'smaller',
    units: 'ms',
  },
  {
    name: '1 item, 1k updates',
    app: 'one-item-many-updates',
    query: '&updates=1000&percentRandomAwait=0',
    whatsBetter: 'smaller',
    units: 'ms',
  },
  // {
  //   name: '1 item, 1k updates, triggered by render',
  //   app: 'one-item-many-updates',
  //   query: '&updates=1000&percentRandomAwait=0',
  // whatsBetter: 'smaller',
  // units: 'ms',
  // },
  {
    name: '1 item, 100k updates (async)',
    app: 'one-item-many-updates',
    query: `&updates=100000&percentRandomAwait=${randomAwaitChance}`,
    whatsBetter: 'smaller',
    units: 'ms',
  },
  {
    name: '1 item, 100k updates',
    app: 'one-item-many-updates',
    query: '&updates=100000&percentRandomAwait=0',
    whatsBetter: 'smaller',
    units: 'ms',
  },
  {
    name: '1 item, 1M updates (async)',
    app: 'one-item-many-updates',
    query: `&updates=1000000&percentRandomAwait=${randomAwaitChance}`,
    whatsBetter: 'smaller',
    units: 'ms',
  },
  {
    name: '1 item, 1M updates',
    app: 'one-item-many-updates',
    query: '&updates=1000000&percentRandomAwait=0',
    whatsBetter: 'smaller',
    units: 'ms',
  },
  {
    name: '1k items, 1 update each (sequentially, async)',
    app: 'ten-k-items-one-time',
    query: `&items=1000&updates=1000&percentRandomAwait=${randomAwaitChance}`,
    whatsBetter: 'smaller',
    units: 'ms',
  },
  {
    name: '1k items, 1 update each (sequentially)',
    app: 'ten-k-items-one-time',
    query: '&items=1000&updates=1000&percentRandomAwait=0',
    whatsBetter: 'smaller',
    units: 'ms',
  },
  {
    name: '1k items 1 update on 5% (random, async)',
    app: 'ten-k-items-one-time',
    query: `&items=1000&updates=50&random=true&percentRandomAwait=${randomAwaitChance}`,
    whatsBetter: 'smaller',
    units: 'ms',
  },
  {
    name: '1k items 1 update on 5% (random)',
    app: 'ten-k-items-one-time',
    query: '&items=1000&updates=50&random=true&percentRandomAwait=0',
    whatsBetter: 'smaller',
    units: 'ms',
  },
  {
    name: '1k items 1 update on 25% (random, async)',
    app: 'ten-k-items-one-time',
    query: `&items=1000&updates=250&random=true&percentRandomAwait=${randomAwaitChance}`,
    whatsBetter: 'smaller',
    units: 'ms',
  },
  {
    name: '1k items 1 update on 25% (random)',
    app: 'ten-k-items-one-time',
    query: '&items=1000&updates=250&random=true&percentRandomAwait=0',
    whatsBetter: 'smaller',
    units: 'ms',
  },
];

async function getFrameworks() {
  let selectedFrameworks: string[] | undefined = args.FRAMEWORK
    ? [args.FRAMEWORK]
    : undefined;

  if (!selectedFrameworks) {
    const result = await clack.multiselect({
      message: 'Which frameworks?',
      options: [...frameworks.values()].map((fw) => {
        return { value: fw, label: fw };
      }),
    });

    if (clack.isCancel(result)) {
      clack.log.info('Cancelled');
      process.exit(1);
    }

    selectedFrameworks = result;
  }

  return selectedFrameworks;
}

async function getBenches() {
  let preselected: BenchmarkInfo | undefined;

  if (args.BENCH_NAME) {
    preselected = benchmarks.find((bench) => bench.name === args.BENCH_NAME);
  }

  let selectedBenches: BenchmarkInfo[] | undefined = preselected
    ? [preselected]
    : undefined;

  if (!selectedBenches) {
    const result = await clack.multiselect({
      message: 'Which benchmarks?',
      options: benchmarks.map((b) => {
        return { value: b, label: b.name };
      }),
    });

    if (clack.isCancel(result)) {
      clack.log.info('Cancelled');
      process.exit(1);
    }

    selectedBenches = result;
  }

  return selectedBenches;
}

const yesterdayFull = new Date(Date.now() - 24 * 60 * 60 * 1000);

async function getFilePath() {
  let existing = await readdir(`./results/public/results/`);

  const today = yyyymmdd.split('T')[0]!;
  const yesterday = yesterdayFull.toJSON().split('T')[0]!;

  existing = existing.filter((x) => x.includes(today) || x.includes(yesterday));

  const result = await clack.select({
    message: 'Where to save?',
    options: [
      { value: yyyymmdd + '.json', label: 'New file', hint: yyyymmdd },
      ...existing.map((x) => {
        return { value: x, label: x };
      }),
    ],
  });

  if (clack.isCancel(result)) {
    clack.log.info('Cancelled');
    process.exit(1);
  }

  return `./results/public/results/${result}`;
}

export async function getBenchInfo() {
  const selectedFrameworks = await getFrameworks();
  const selectedBenches = await getBenches();
  const filePath = await getFilePath();

  console.info(inspect(info, { showHidden: false, depth: null, colors: true }));
  console.log(`
    Results will be written to ${filePath}
  `);

  const letsgo = await clack.confirm({
    message: 'Does this information look correct?',
  });

  if (!letsgo || clack.isCancel(letsgo)) {
    clack.log.info('Exiting');
    process.exit(1);
  }

  assert(selectedBenches, `Must select at least one benchmark`);
  assert(selectedBenches.length > 0, `Must select at least one benchmark`);

  const apps = new Set(selectedBenches.map((b) => b.app));

  await saveBenchmarkInfo(
    {
      benches: selectedBenches,
      frameworks: selectedFrameworks,
    },
    filePath,
  );

  return {
    apps,
    benches: selectedBenches,
    frameworks: selectedFrameworks,
    variants: variants,
    filePath,
  };
}
