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

export async function saveBenchmarkInfo(
  info: {
    benches: BenchmarkInfo[];
    frameworks: FrameworkInfo[];
  },
  filePath: string,
) {
  const file = await read(filePath);

  const better = new Set();

  const smaller = [];
  const bigger = [];

  for (const bench of info.benches) {
    const kind = bench.whatsBetter || 'smaller';

    if (kind === 'smaller') {
      smaller.push(bench.name);
    }

    if (kind === 'bigger') {
      bigger.push(bench.name);
    }

    better.add(kind);
  }

  assert(
    better.size === 1,
    `Expected only one type of bench comparison in selected set of benchmarks. Cannot both measure both smaller being better while also wanting bigger measurements to be better. Smaller: ${smaller.join(', ')} -- Bigger: ${bigger.join(', ')}`,
  );

  file.whatsBetter = [...better.values()][0];
  file.selections = {
    benches: info.benches.map((bench) => bench.name),
    frameworks: info.frameworks,
  };

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
