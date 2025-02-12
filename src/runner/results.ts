import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { getInfo, yyyymmdd } from './environment.ts';
import type { BenchmarkInfo } from './bench-info.ts';
import { frameworks } from '../../results/app/frameworks.ts';
import { join } from 'node:path';
import assert from 'node:assert';

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

async function getVersion(framework: string, bench: BenchmarkInfo) {
  let dir = join('frameworks', framework, bench.app);
  let manifestPath = join(dir, 'package.json');
  let manifestBuffer = await fs.readFile(manifestPath);
  let manifest = JSON.parse(manifestBuffer.toString());
  let dependencies = {
    ...manifest.devDependencies,
    ...manifest.dependencies,
  };

  let packageName = frameworks[framework]?.package;

  assert(packageName, `Could not find framework in the frameworks.ts file`);

  let version = dependencies[packageName];

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
  let query = bench.query;
  let version = await getVersion(framework, bench);

  existing[framework] ||= {};
  existing[framework][benchName] = {};
  existing[framework][benchName].url = query;
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
