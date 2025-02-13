import { info } from './results.ts';
import { readdir } from 'node:fs/promises';
import * as clack from '@clack/prompts';
import { inspect } from 'node:util';
import { frameworks } from './repo.ts';
import * as args from './arg.ts';
import { yyyymmdd } from './environment.ts';

export interface BenchmarkInfo {
  name: string;
  app: string;
  query: string;
}

const variants = [
  { name: '', query: '&manualBatch=false' },
  // Batching is a fair technique, but I don't know if I want it always present.
  // We'll see if I change my mind when Solid v2 comes out.
  // { name: 'w/ manual batching', query: '?manualBatch=true' },
];

const randomAwaitChance = 50;
const benchmarks = [
  {
    name: '1 item, 1k updates (async)',
    app: 'one-item-many-updates',
    query: `&updates=1000&percentRandomAwait=${randomAwaitChance}`,
  },
  {
    name: '1 item, 1k updates',
    app: 'one-item-many-updates',
    query: '&updates=1000&percentRandomAwait=0',
  },
  {
    name: '1 item, 100k updates (async)',
    app: 'one-item-many-updates',
    query: `&updates=100000&percentRandomAwait=${randomAwaitChance}`,
  },
  {
    name: '1 item, 100k updates',
    app: 'one-item-many-updates',
    query: '&updates=100000&percentRandomAwait=0',
  },
  {
    name: '1 item, 1M updates (async)',
    app: 'one-item-many-updates',
    query: `&updates=1000000&percentRandomAwait=${randomAwaitChance}`,
  },
  {
    name: '1 item, 1M updates',
    app: 'one-item-many-updates',
    query: '&updates=1000000&percentRandomAwait=0',
  },
  {
    name: '1k items, 1 update each (sequentially, async)',
    app: 'ten-k-items-one-time',
    query: `&items=1000&updates=1000&percentRandomAwait=${randomAwaitChance}`,
  },
  {
    name: '1k items, 1 update each (sequentially)',
    app: 'ten-k-items-one-time',
    query: '&items=1000&updates=1000&percentRandomAwait=0',
  },
  {
    name: '1k items 1 update on 5% (random, async)',
    app: 'ten-k-items-one-time',
    query: `&items=1000&updates=50&random=true&percentRandomAwait=${randomAwaitChance}`,
  },
  {
    name: '1k items 1 update on 5% (random)',
    app: 'ten-k-items-one-time',
    query: '&items=1000&updates=50&random=true&percentRandomAwait=0',
  },
  {
    name: '1k items 1 update on 25% (random, async)',
    app: 'ten-k-items-one-time',
    query: `&items=1000&updates=250&random=true&percentRandomAwait=${randomAwaitChance}`,
  },
  {
    name: '1k items 1 update on 25% (random)',
    app: 'ten-k-items-one-time',
    query: '&items=1000&updates=250&random=true&percentRandomAwait=0',
  },
];

async function getFrameworks() {
  let selectedFrameworks: string[] | undefined = args.FRAMEWORK
    ? [args.FRAMEWORK]
    : undefined;

  if (!selectedFrameworks) {
    let result = await clack.multiselect({
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
    let result = await clack.multiselect({
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

async function getFilePath() {
  let existing = await readdir(`./results/public/results/`);

  let today = yyyymmdd.split('T')[0]!;

  existing = existing.filter((x) => x.includes(today));

  let result = await clack.select({
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
  let selectedFrameworks = await getFrameworks();
  let selectedBenches = await getBenches();
  let filePath = await getFilePath();

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

  let apps = new Set(selectedBenches.map((b) => b.app));

  return {
    apps,
    benches: selectedBenches,
    frameworks: selectedFrameworks,
    variants: variants,
    filePath,
  };
}
