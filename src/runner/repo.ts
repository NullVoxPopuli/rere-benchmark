import assert from 'node:assert';
import path from 'node:path';

import { globby } from 'globby';

import { BENCH_NAME, FRAMEWORK } from './arg.ts';

export async function getTests() {
  let results = await globby('**/package.json', { gitignore: true });

  results = results
    .filter((result) => result.startsWith('framework'))
    .map((result) => path.dirname(result));

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
