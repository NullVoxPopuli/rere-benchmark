import { globby } from 'globby';
import path from 'node:path';
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
