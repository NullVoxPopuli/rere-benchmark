import { info, filePath } from './results.ts';
import * as clack from '@clack/prompts';
import { inspect } from 'node:util';
import { frameworks } from './repo.ts';
import * as args from './arg.ts';

interface BenchmarkInfo {
  name: string;
  app: string;
  query: string;
}

const benchmarks = [
  {
    name: '1 item, 10k updates',
    app: 'one-item-many-updates',
    query: '',
  },
  {
    name: '1 item, 100k updates',
    app: 'one-item-many-updates',
    query: '?updates=100000',
  },
  {
    name: '10k items, 1 update each (sequentially)',
    app: 'ten-k-items-one-time',
    query: '',
  },
  {
    name: '10k items 1 update on 5% (random)',
    app: 'ten-k-items-one-time',
    query: '?updates=500&random=true',
  },
  {
    name: '10k items 1 update on 25% (random)',
    app: 'ten-k-items-one-time',
    query: '?updates=2500&random=true',
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

export async function getBenchInfo() {
  let selectedFrameworks = await getFrameworks();
  let selectedBenches = await getBenches();

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

  return { apps, benches: selectedBenches, frameworks: selectedFrameworks };
}
