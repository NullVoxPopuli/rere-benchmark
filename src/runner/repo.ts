import { globby } from 'globby';
import path from 'node:path';
import { BENCH_NAME, FRAMEWORK } from './arg.ts';
import assert from 'node:assert';

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

let tests = await getTests();

export let frameworks = new Set<string>();
export let benchNames = new Set<string>();

for (let test of tests) {
  let [, /* frameworks folder */ fw, name] = test.split('/');

  assert(fw, `Framework name missing for ${test}`);
  assert(name, `Bench name missing for ${test}`);

  frameworks.add(fw);
  benchNames.add(name);
}
