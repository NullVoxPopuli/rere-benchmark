import assert from 'node:assert';
import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join } from 'node:path';

import { packageUp } from 'package-up';

import {
  type FrameworkInfo,
  frameworks,
} from '../../results/app/frameworks.ts';
import { getInfo } from './environment.ts';

import type {
  PullRequestNote,
  VersionOverride,
} from '../../results/app/types.ts';
import type { BenchmarkInfo } from './bench-info.ts';

const require = createRequire(import.meta.url);

export const info = await getInfo();

async function read(filePath: string) {
  if (!existsSync(filePath)) {
    return {
      ...info,
      results: {},
    };
  }

  const buffer = await fs.readFile(filePath);
  const json = JSON.parse(buffer.toString());

  return json;
}

async function write(json: any, filePath: string) {
  await fs.writeFile(filePath, JSON.stringify(json, null, 2));
}

async function getResults(filePath: string) {
  const json = await read(filePath);

  return json.results;
}

async function saveResults(results: any, filePath: string) {
  const file = await read(filePath);

  file.results = results;

  await write(file, filePath);
}

/**
 * Numbers in one file must be comparable, and hardware is part of the
 * measurement: appending runs from a different machine (or a different
 * monitor -- the frame-rate bench is capped by its refresh rate) would mix
 * results that cannot be compared.
 */
export async function assertSameEnvironment(filePath: string) {
  if (!existsSync(filePath)) return;

  const file = await read(filePath);
  const recorded = file.environment;

  if (!recorded) {
    return;
  }

  const current = info.environment;
  const mismatches: string[] = [];

  if (recorded.machine?.cpu !== current.machine.cpu) {
    mismatches.push(`cpu: ${recorded.machine?.cpu} vs ${current.machine.cpu}`);
  }

  if (recorded.machine?.ram !== current.machine.ram) {
    mismatches.push(`ram: ${recorded.machine?.ram} vs ${current.machine.ram}`);
  }

  if (recorded.monitor?.hz !== current.monitor.hz) {
    mismatches.push(
      `monitor: ${recorded.monitor?.hz}hz vs ${current.monitor.hz}hz`,
    );
  }

  assert(
    mismatches.length === 0,
    `${filePath} was recorded on different hardware (recorded vs now):\n` +
      mismatches.map((mismatch) => `  ${mismatch}`).join('\n'),
  );

  /**
   * Not hardware, so not fatal -- but an OS or browser update between runs
   * is still worth knowing about when reading the numbers later.
   */
  if (
    JSON.stringify(recorded.machine?.os) !== JSON.stringify(current.machine.os)
  ) {
    console.warn(
      `${filePath} was recorded on ${recorded.machine?.os?.name} ${recorded.machine?.os?.version}, ` +
        `this is ${current.machine.os.name} ${current.machine.os.version}`,
    );
  }

  if (JSON.stringify(recorded.browser) !== JSON.stringify(current.browser)) {
    console.warn(
      `${filePath} was recorded with ${recorded.browser?.name} ${recorded.browser?.version}, ` +
        `this is ${current.browser.name} ${current.browser.version}`,
    );
  }
}

export interface Timing {
  /**
   * Wall-clock time (ms) spent installing + building all apps.
   * Omitted when SKIP_BUILD is set (no build ran).
   */
  buildMs?: number;
  /**
   * Wall-clock time (ms) spent running the benchmark suite
   * (does not include build time).
   */
  benchmarkMs: number;
  /**
   * Total wall-clock time (ms) for the whole run, build + benchmark.
   */
  totalMs: number;
}

export async function saveTiming(timing: Timing, filePath: string) {
  const file = await read(filePath);

  file.timing = timing;

  await write(file, filePath);
}

/**
 * `existing` in the order it already has, then whatever `fresh` adds.
 */
function union<T>(existing: T[] | undefined, fresh: T[]) {
  return Array.from(new Set(existing ?? []).union(new Set(fresh)));
}

type SavedBenchmarkInfo = Omit<BenchmarkInfo, 'ignoreCount'>;

/**
 * By name, with this run's descriptor winning for a bench it re-ran.
 */
function mergeBenchmarkInfo(
  existing: SavedBenchmarkInfo[] | undefined,
  fresh: SavedBenchmarkInfo[],
) {
  const byName = new Map(
    (existing ?? []).map((bench) => [bench.name, bench] as const),
  );

  for (const bench of fresh) {
    byName.set(bench.name, bench);
  }

  return Array.from(byName.values());
}

/**
 * What a run selected, and the descriptor for each bench it ran.
 *
 * Merged in, so appending a partial run (`--framework preact`, say) to an
 * existing file keeps the runs already in it. The results app renders
 * exactly what `selections` lists rather than what `results` holds, so
 * replacing it hid every framework but the one just appended.
 */
export async function saveBenchmarkInfo(
  info: {
    benches: BenchmarkInfo[];
    frameworks: FrameworkInfo[];
  },
  filePath: string,
) {
  const file = await read(filePath);

  const benches: SavedBenchmarkInfo[] = info.benches.map((bench) => {
    // ignoreCount is only used for the runner
    const { ignoreCount: _, ...rest } = bench;

    return rest;
  });

  file.selections = {
    benches: union(
      file.selections?.benches,
      benches.map((bench) => bench.name),
    ),
    frameworks: union(file.selections?.frameworks, info.frameworks),
  };

  file.benchmarkInfo = mergeBenchmarkInfo(file.benchmarkInfo, benches);

  await write(file, filePath);
}

/**
 * Which PR each framework's build came from, when it came from one.
 * Merged in, so appending to an existing file keeps the runs already in it.
 */
export async function saveVersionOverrides(
  overrides: Record<string, VersionOverride>,
  filePath: string,
) {
  if (Object.keys(overrides).length === 0) return;

  const file = await read(filePath);

  file.versionOverrides = { ...file.versionOverrides, ...overrides };

  await write(file, filePath);
}

async function readJSON(filePath: string) {
  const buffer = await fs.readFile(filePath);
  const json = JSON.parse(buffer.toString());

  return json;
}

/**
 * Per-framework notes, collected from `frameworks/<framework>/notes.json`
 * when present, keyed by framework name. Lets a run carry small labels the
 * results app shows -- e.g. Vue's `{ "variant": "Vapor" }`. Merged in, so
 * appending to an existing file keeps notes already written to it.
 */
export async function saveNotes(frameworks: string[], filePath: string) {
  const notes: Record<string, unknown> = {};

  for (const framework of frameworks) {
    const notePath = join('frameworks', framework, 'notes.json');

    if (!existsSync(notePath)) continue;

    notes[framework] = await readJSON(notePath);
  }

  if (Object.keys(notes).length === 0) return;

  const file = await read(filePath);

  file.notes = { ...file.notes, ...notes };

  await write(file, filePath);
}

/**
 * The PRs that landed between the previous result set and this run
 * (`--include-prs`, from git history). Merged in and deduplicated by URL,
 * so hand-added entries (plain URL strings) and earlier appends survive.
 */
export async function savePrNotes(prs: PullRequestNote[], filePath: string) {
  if (prs.length === 0) return;

  const file = await read(filePath);

  const existing: Array<string | PullRequestNote> = file.notes?.prs ?? [];
  const known = new Set(
    existing.map((pr) => (typeof pr === 'string' ? pr : pr.url)),
  );
  const fresh = prs.filter((pr) => !known.has(pr.url));

  file.notes = { ...file.notes, prs: existing.concat(fresh) };

  await write(file, filePath);
}

async function getVersion(framework: string, bench: BenchmarkInfo) {
  const dir = join('frameworks', framework, bench.app);
  const manifestPath = join(dir, 'package.json');
  const packageName = frameworks[framework]?.package;

  assert(
    packageName,
    `Could not find framework (${framework}) in the frameworks.ts file`,
  );

  let entry: string;

  try {
    entry = require.resolve(packageName, { paths: [dir] });
  } catch {
    // if the '.' is not listed in exports, the above will fail
    entry = require.resolve(`${packageName}/package.json`, { paths: [dir] });
  }

  const packageManifestPath = await packageUp({ cwd: entry });

  assert(
    packageManifestPath,
    `The package, ${packageName}, does not have a package.json. This is required.`,
  );

  const dependencyManifest = await readJSON(packageManifestPath);
  const version = dependencyManifest.version;

  assert(
    version,
    `Could not find version for ${packageName} in ${manifestPath}`,
  );

  return version;
}

export async function prepareForResults(
  framework: string,
  bench: BenchmarkInfo,
  filePath: string,
) {
  const existing = await getResults(filePath);

  const benchName = bench.name;
  const version = await getVersion(framework, bench);

  existing[framework] ||= {};
  existing[framework][benchName] = {};
  existing[framework][benchName].app = bench.app;
  existing[framework][benchName].query = bench.query;
  existing[framework][benchName].version = version;
  existing[framework][benchName].times = [];

  await saveResults(existing, filePath);
}

export async function addResult(
  framework: string,
  benchName: string,
  result: any,
  filePath: string,
  benchInfo: BenchmarkInfo,
) {
  const existing = await getResults(filePath);

  existing[framework] ||= {};
  existing[framework][benchName] ||= {};
  existing[framework][benchName].times ||= [];
  existing[framework][benchName].times.push(result);

  if (benchInfo.measure) {
    existing[framework][benchName].measure = benchInfo.measure;
  }

  if (benchInfo.whatsBetter) {
    existing[framework][benchName].whatsBetter = benchInfo.whatsBetter;
  }

  await saveResults(existing, filePath);
}
