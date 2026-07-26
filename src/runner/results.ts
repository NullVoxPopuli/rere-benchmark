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

import type { VersionOverride } from '../../results/app/types.ts';
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

export async function saveBenchmarkInfo(
  info: {
    benches: BenchmarkInfo[];
    frameworks: FrameworkInfo[];
  },
  filePath: string,
) {
  const file = await read(filePath);

  file.selections = {
    benches: info.benches.map((bench) => bench.name),
    frameworks: info.frameworks,
  };

  file.benchmarkInfo = info.benches.map((bench) => {
    // ignoreCount is only used for the runner
    const { ignoreCount: _, ...rest } = bench;

    return rest;
  });

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

/**
 * Clears out whatever a previous run left under this framework/bench pair,
 * so appending to an existing file replaces that series rather than
 * growing it.
 *
 * `resultName` rather than `bench.name`: a named variant is recorded as
 * `"<bench> <variant>"`, which is the key `addResult` writes to. Keying the
 * reset off the bare bench name meant a variant's samples were never
 * cleared, and the bare name was cleared without ever being written to.
 * Dormant while the only variant is the unnamed one, and wrong the moment
 * the manual-batching variant comes back.
 */
export async function prepareForResults(
  framework: string,
  bench: BenchmarkInfo,
  resultName: string,
  filePath: string,
) {
  const existing = await getResults(filePath);

  const benchName = resultName;
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
