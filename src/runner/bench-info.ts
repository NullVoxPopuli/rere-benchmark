import assert from 'node:assert';
import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { inspect } from 'node:util';

import * as clack from '@clack/prompts';

import * as args from './arg.ts';
import { benchmarks, variants } from './benchmarks.ts';
import { info } from './environment.ts';
import { prsSinceLastResultSet } from './prs.ts';
import { frameworks } from './repo.ts';
import { ResultFile } from './result-file.ts';

import type { PullRequestNote } from '../../results/app/types.ts';

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

const RESULTS_DIR = './results/public/results';

/**
 * Result files are numbered sequentially (`1.json`, `2.json`, ...), so a
 * new run's file is one past the highest number already used. Anything
 * that isn't a plain number doesn't participate.
 */
function nextResultFileName(existing: string[]) {
  let highest = 0;

  for (const file of existing) {
    if (!file.endsWith('.json')) continue;

    const number = Number(basename(file, '.json'));

    if (Number.isInteger(number) && number > highest) {
      highest = number;
    }
  }

  return `${highest + 1}.json`;
}

const startOfYesterday = new Date();

startOfYesterday.setHours(0, 0, 0, 0);
startOfYesterday.setDate(startOfYesterday.getDate() - 1);

const RUN_DATE_FORMAT = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

/**
 * Appending only makes sense into a fresh result set, so only files whose
 * run started today or yesterday are offered. The run date lives inside
 * each file (names are just numbers), so the files have to be opened.
 */
async function recentResultFiles(existing: string[]) {
  const recent: Array<{ file: string; date: Date }> = [];

  for (const file of existing) {
    if (!file.endsWith('.json')) continue;

    const buffer = await readFile(join(RESULTS_DIR, file));
    const json = JSON.parse(buffer.toString());
    const date = new Date(json.date);

    if (Number.isNaN(date.getTime())) continue;
    if (date < startOfYesterday) continue;

    recent.push({ file, date });
  }

  return recent;
}

async function getFilePath() {
  if (args.FILE) {
    assert(
      existsSync(args.FILE),
      `--file=${args.FILE} does not exist -- it appends to a result set that has already been created`,
    );

    return args.FILE;
  }

  const existing = await readdir(RESULTS_DIR);
  const fresh = nextResultFileName(existing);
  const recent = await recentResultFiles(existing);

  const result = await clack.select({
    message: 'Where to save?',
    options: [{ value: fresh, label: 'New file', hint: fresh }].concat(
      recent.map(({ file, date }) => {
        return { value: file, label: file, hint: RUN_DATE_FORMAT.format(date) };
      }),
    ),
  });

  if (clack.isCancel(result)) {
    clack.log.info('Cancelled');
    process.exit(1);
  }

  return `${RESULTS_DIR}/${result}`;
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
  const file = new ResultFile(await getFilePath());

  await file.assertSameEnvironment();

  // resolved before the confirm below, so what will be recorded is part
  // of the "does this look correct?" review
  let prNotes: PullRequestNote[] = [];

  if (args.INCLUDE_PRS) {
    const found = await prsSinceLastResultSet(file.path);

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
    Results will be written to ${file.path}
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

  await file.saveBenchmarkInfo({
    benches: selectedBenches,
    frameworks: selectedFrameworks,
  });

  await file.saveVersionOverrides(args.VERSION_OVERRIDES);
  await file.saveNotes(selectedFrameworks);
  await file.savePrNotes(prNotes);

  return {
    apps,
    benches: selectedBenches,
    frameworks: selectedFrameworks,
    variants: variants,
    file,
  };
}
