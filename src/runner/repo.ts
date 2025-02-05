import { globby } from 'globby';
import path from 'node:path';

export async function getTests() {
  let results = await globby('**/package.json', { gitignore: true });
  return results
    .filter((result) => result.startsWith('framework'))
    .map((result) => path.dirname(result));
}
