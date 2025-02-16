import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { getInfo } from './environment.ts';
import type { BenchmarkInfo } from './bench-info.ts';
import { frameworks } from '../../results/app/frameworks.ts';
import { join } from 'node:path';
import assert from 'node:assert';
import { createRequire } from 'node:module';
import { packageUp } from 'package-up';

const require = createRequire(import.meta.url);

export const info = await getInfo();

async function read(filePath: string) {
  if (!existsSync(filePath)) {
    return {
      ...info,
      results: {},
    };
  }

  let buffer = await fs.readFile(filePath);
  let json = JSON.parse(buffer.toString());

  return json;
}

async function write(json: any, filePath: string) {
  await fs.writeFile(filePath, JSON.stringify(json, null, 2));
}

async function getResults(filePath: string) {
  let json = await read(filePath);
  return json.results;
}

async function saveResults(results: any, filePath: string) {
  let file = await read(filePath);

  file.results = results;

  await write(file, filePath);
}

async function readJSON(filePath: string) {
  let buffer = await fs.readFile(filePath);
  let json = JSON.parse(buffer.toString());
  return json;
}

async function getVersion(framework: string, bench: BenchmarkInfo) {
  let dir = join('frameworks', framework, bench.app);
  let manifestPath = join(dir, 'package.json');
  let packageName = frameworks[framework]?.package;

  assert(
    packageName,
    `Could not find framework (${framework}) in the frameworks.ts file`,
  );

  let entry: string;
  try {
    entry = require.resolve(packageName, { paths: [dir] });
  } catch (e) {
    // if the '.' is not listed in exports, the above will fail
    entry = require.resolve(`${packageName}/package.json`, { paths: [dir] });
  }

  let packageManifestPath = await packageUp({ cwd: entry });
  assert(
    packageManifestPath,
    `The package, ${packageName}, does not have a package.json. This is required.`,
  );
  let dependencyManifest = await readJSON(packageManifestPath);
  let version = dependencyManifest.version;

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
  let existing = await getResults(filePath);

  let benchName = bench.name;
  let version = await getVersion(framework, bench);

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
) {
  let existing = await getResults(filePath);

  existing[framework] ||= {};
  existing[framework][benchName] ||= {};
  existing[framework][benchName].times ||= [];
  existing[framework][benchName].times.push(result);

  await saveResults(existing, filePath);
}
