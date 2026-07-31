import assert from 'node:assert';
import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { inspect } from 'node:util';

import * as clack from '@clack/prompts';

import * as args from './arg.ts';
import { yyyymmdd } from './environment.ts';
import { prsSinceLastResultSet } from './prs.ts';
import { frameworks } from './repo.ts';
import {
  info,
  saveBenchmarkInfo,
  saveNotes,
  savePrNotes,
  saveVersionOverrides,
} from './results.ts';

import type { PullRequestNote } from '../../results/app/types.ts';

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
    name: 'Incrementing Render Effect',
    app: 'incrementing-render-effect',
    query: '&updates=100000',
    whatsBetter: 'smaller',
    units: 'ms',
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
  {
    name: '1 value, 1k consumers, 10k updates (bursts of 100)',
    app: 'fan-out',
    query: '&consumers=1000&updates=10000&burstSize=100',
    whatsBetter: 'smaller',
    units: 'ms',
  },
  {
    name: '1 value, 1k consumers, 10k updates (bursts of 1000)',
    app: 'fan-out',
    query: '&consumers=1000&updates=10000&burstSize=1000',
    whatsBetter: 'smaller',
    units: 'ms',
  },
  {
    name: '1 value, 1k consumers, 10k updates (single burst)',
    app: 'fan-out',
    query: '&consumers=1000&updates=10000&burstSize=10000',
    whatsBetter: 'smaller',
    units: 'ms',
  },
];

async function getFrameworks() {
  if (args.FRAMEWORK === args.ALL) {
    return [...frameworks.values()];
  }

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

/**
 * The bench selection recorded in an existing result file, so `--file`
 * (and `pnpm bench:add` on top of it) re-runs exactly what the file holds.
 */
async function benchNamesFrom(filePath: string) {
  const buffer = await readFile(filePath);
  const file = JSON.parse(buffer.toString());
  const names: unknown = file.selections?.benches;

  assert(
    Array.isArray(names) && names.length > 0,
    `${filePath} does not record which benches it ran (selections.benches)`,
  );

  return names as string[];
}

/**
 * The named benches, warning about names that do not match any bench --
 * a rename since the names were recorded, or a typo.
 */
function benchesNamed(names: string[], source: string) {
  const known = benchmarks.filter((bench) => names.includes(bench.name));
  const unknown = names.filter(
    (name) => !known.some((bench) => bench.name === name),
  );

  if (unknown.length > 0) {
    clack.log.warn(
      `Bench names from ${source} that do not exist (skipped):\n` +
        unknown.map((name) => `  ${name}`).join('\n'),
    );
  }

  assert(known.length > 0, `No existing benches were named by ${source}`);

  return known;
}

async function getBenches() {
  if (args.BENCH_NAME === args.ALL) {
    return benchmarks;
  }

  if (args.BENCH_NAMES.length > 0) {
    return benchesNamed(args.BENCH_NAMES, '--bench');
  }

  if (args.FILE) {
    const names = await benchNamesFrom(args.FILE);
    const known = benchesNamed(names, args.FILE);

    clack.log.info(
      `Benches recorded in ${args.FILE}:\n` +
        known.map((bench) => `  ${bench.name}`).join('\n'),
    );

    return known;
  }

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

  return result;
}

const yesterdayFull = new Date(Date.now() - 24 * 60 * 60 * 1000);

async function getFilePath() {
  if (args.FILE) {
    assert(
      existsSync(args.FILE),
      `--file=${args.FILE} does not exist -- it appends to a result set that has already been created`,
    );

    return args.FILE;
  }

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

  for (const framework of Object.keys(args.VERSION_OVERRIDES)) {
    if (selectedFrameworks.includes(framework)) continue;

    clack.log.warn(
      `--${framework} was given a PR, but ${framework} is not being benchmarked`,
    );
  }

  const selectedBenches = await getBenches();
  const filePath = await getFilePath();

  // resolved before the confirm below, so what will be recorded is part
  // of the "does this look correct?" review
  let prNotes: PullRequestNote[] = [];

  if (args.INCLUDE_PRS) {
    const found = await prsSinceLastResultSet(filePath);

    if (found && found.prs.length > 0) {
      prNotes = found.prs;

      clack.log.info(
        `PRs since the previous result set (${found.since}):\n` +
          found.prs
            .map((pr) => `  ${pr.url}${pr.title ? ` — ${pr.title}` : ''}`)
            .join('\n'),
      );
    } else {
      clack.log.warn(
        `--include-prs: no PRs found since the previous result set`,
      );
    }
  }

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

  await saveVersionOverrides(args.VERSION_OVERRIDES, filePath);
  await saveNotes(selectedFrameworks, filePath);
  await savePrNotes(prNotes, filePath);

  return {
    apps,
    benches: selectedBenches,
    frameworks: selectedFrameworks,
    variants: variants,
    filePath,
  };
}
