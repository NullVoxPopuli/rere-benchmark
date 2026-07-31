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
import { readdir, readFile } from 'node:fs/promises';
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
  /**
   * When the set's run started, from the file's `date` field -- the
   * numbered file names carry no date. Invalid on files without one.
   */
  recordedAt: Date;
}

const RUN_DATE_FORMAT = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function hintFor(candidate: Candidate) {
  if (Number.isNaN(candidate.recordedAt.getTime())) return candidate.kind;

  return `${candidate.kind} · ${RUN_DATE_FORMAT.format(candidate.recordedAt)}`;
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
      const json = JSON.parse((await readFile(path)).toString());

      candidates.push({ path, kind, recordedAt: new Date(json.date) });
    }
  }

  // newest run first; files without a date (NaN) sink to the end
  return candidates.sort(
    (a, b) => (b.recordedAt.getTime() || 0) - (a.recordedAt.getTime() || 0),
  );
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
      return {
        value: candidate,
        label: candidate.path,
        hint: hintFor(candidate),
      };
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

const recordedBenches: string[] = file.selections?.benches ?? [];

if (recordedBenches.length > 1) {
  const benches = exitOnCancel(
    await clack.multiselect({
      message: `Which benches? (a subset replaces just those of ${framework}'s runs)`,
      options: recordedBenches.map((name) => {
        return { value: name, label: name };
      }),
      initialValues: recordedBenches,
    }),
  );

  /**
   * All of them selected means no flag: the runner then takes its
   * selection from the file, exactly as if the subset question was
   * never asked.
   */
  if (benches.length < recordedBenches.length) {
    for (const name of benches) {
      flags.push(`--bench=${name}`);
    }
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

const printable = flags
  .map((flag) => (flag.includes(' ') ? `"${flag}"` : flag))
  .join(' ');

clack.log.info(`Running: pnpm bench ${printable}`);
clack.outro('Handing off to the benchmark runner');

const result = await $({
  preferLocal: true,
  stdio: 'inherit',
  reject: false,
})`pnpm bench ${flags}`;

process.exit(result.exitCode ?? 1);
