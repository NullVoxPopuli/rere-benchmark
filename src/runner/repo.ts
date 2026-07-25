import assert from 'node:assert';
import fs from 'node:fs/promises';
import path from 'node:path';

import { BENCH_NAME, FRAMEWORK } from './arg.ts';

export async function getTests() {
  /**
   * Every app lives at frameworks/<framework>/<bench>,
   * so there is nothing deeper to search (and no node_modules to skip).
   */
  const manifests = await Array.fromAsync(
    fs.glob('frameworks/*/*/package.json'),
  );

  let results = manifests.map((manifest) => path.dirname(manifest)).sort();

  if (FRAMEWORK) {
    results = results.filter((result) => result.includes(`/${FRAMEWORK}/`));
  }

  if (BENCH_NAME) {
    results = results.filter((result) => result.includes(`${BENCH_NAME}`));
  }

  return results;
}

const tests = await getTests();

export const frameworks = new Set<string>();
export const benchNames = new Set<string>();

for (const test of tests) {
  const [, /* frameworks folder */ fw, name] = test.split('/');

  assert(fw, `Framework name missing for ${test}`);
  assert(name, `Bench name missing for ${test}`);

  frameworks.add(fw);
  benchNames.add(name);
}
