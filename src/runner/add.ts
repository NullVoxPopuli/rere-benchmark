/**
 * `pnpm bench:add`
 *
 * Walks through adding one framework's runs to an existing result set --
 * or replacing the runs it already has (same name) -- using the settings
 * the file was recorded with. Ends by handing off to `pnpm bench` with
 * the equivalent flags, so the run itself is the same code path as always.
 *
 * Deliberately does not import arg.ts (directly or via repo.ts): importing
 * it prints the runner's flag table, which describes the flags of *this*
 * process rather than the ones this wizard assembles.
 */
import assert from 'node:assert';
import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import * as clack from '@clack/prompts';
import { $ } from 'execa';

const RESULT_DIRS = [
  { dir: 'results/public/results', kind: 'result' },
  { dir: 'results/public/experiments', kind: 'experiment' },
] as const;

interface Candidate {
  path: string;
  kind: (typeof RESULT_DIRS)[number]['kind'];
  modifiedAt: number;
}

async function listResultFiles() {
  const candidates: Candidate[] = [];

  for (const { dir, kind } of RESULT_DIRS) {
    let entries: string[];

    try {
      entries = await readdir(dir);
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (!entry.endsWith('.json')) continue;

      const path = join(dir, entry);
      const { mtimeMs } = await stat(path);

      candidates.push({ path, kind, modifiedAt: mtimeMs });
    }
  }

  return candidates.sort((a, b) => b.modifiedAt - a.modifiedAt);
}

function exitOnCancel<T>(value: T | symbol): T {
  if (clack.isCancel(value)) {
    clack.cancel('Cancelled');
    process.exit(1);
  }

  return value as T;
}

clack.intro(`Add (or replace) one framework in an existing result set`);

const candidates = await listResultFiles();

assert(
  candidates.length > 0,
  `No result sets found in ${RESULT_DIRS.map(({ dir }) => dir).join(' or ')} -- run \`pnpm bench\` first`,
);

const target = exitOnCancel(
  await clack.select({
    message: 'Which result set?',
    options: candidates.map((candidate) => {
      return { value: candidate, label: candidate.path, hint: candidate.kind };
    }),
  }),
);

const file = JSON.parse((await readFile(target.path)).toString());
const recordedArgs = file.args ?? {};
const already = Object.keys(file.results ?? {});

if (!file.args) {
  clack.log.warn(
    `${target.path} does not record the flags it ran with; falling back to the runner's defaults`,
  );
}

clack.log.info(
  [
    `Recorded in ${target.path}:`,
    `  cpu-throttle: ${recordedArgs.CPU_THROTTLE ?? 1}`,
    `  count:        ${recordedArgs.COUNT ?? 10}`,
    `  timeout:      ${recordedArgs.TIMEOUT ?? 60_000}`,
    `  headless:     ${recordedArgs.HEADLESS ?? false}`,
    `  benches:      ${file.selections?.benches?.length ?? '(unknown)'}`,
    `  frameworks:   ${already.join(', ') || '(none yet)'}`,
  ].join('\n'),
);

const frameworksDir = await readdir('frameworks', { withFileTypes: true });
const available = frameworksDir
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

const framework = exitOnCancel(
  await clack.select({
    message: 'Which framework?',
    options: available.map((name) => {
      return {
        value: name,
        label: name,
        hint: already.includes(name) ? 'replace its existing runs' : 'add',
      };
    }),
  }),
);

const flags = [
  `--framework=${framework}`,
  `--file=${target.path}`,
  `--cpu-throttle=${recordedArgs.CPU_THROTTLE ?? 1}`,
  `--count=${recordedArgs.COUNT ?? 10}`,
  `--timeout=${recordedArgs.TIMEOUT ?? 60_000}`,
];

if (recordedArgs.HEADLESS) {
  flags.push('--headless');
}

/**
 * A `use-tar-for` experiment labels the framework with the PR its build
 * came from. Replacing those runs with a normally-installed build while
 * the label sticks around would misattribute the new numbers.
 */
const override = file.versionOverrides?.[framework];

if (override) {
  const stillFromPr = exitOnCancel(
    await clack.confirm({
      message:
        `This file labels ${framework} as built from ${override.url}. ` +
        `Is this run also from that PR (the use-tar-for tarball is still installed)?`,
      initialValue: false,
    }),
  );

  if (stillFromPr) {
    flags.push(`--${framework}=${override.url}`);
  } else {
    delete file.versionOverrides[framework];

    if (Object.keys(file.versionOverrides).length === 0) {
      delete file.versionOverrides;
    }

    await writeFile(target.path, JSON.stringify(file, null, 2));
    clack.log.info(`Removed the ${override.url} label from ${target.path}`);
  }
}

const build = exitOnCancel(
  await clack.confirm({
    message: `Build ${framework}'s apps first? (choose no to re-use existing dist folders)`,
    initialValue: true,
  }),
);

if (!build) {
  flags.push('--skip-build');
}

clack.log.info(`Running: pnpm bench ${flags.join(' ')}`);
clack.outro('Handing off to the benchmark runner');

const result = await $({
  preferLocal: true,
  stdio: 'inherit',
  reject: false,
})`pnpm bench ${flags}`;

process.exit(result.exitCode ?? 1);
