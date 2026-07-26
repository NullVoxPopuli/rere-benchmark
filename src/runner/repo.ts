import assert from 'node:assert';
import fs from 'node:fs/promises';
import path from 'node:path';

import { ALL, FRAMEWORK } from './arg.ts';

export async function getTests() {
  /**
   * Every app lives at frameworks/<framework>/<bench>,
   * so there is nothing deeper to search (and no node_modules to skip).
   */
  const manifests = await Array.fromAsync(
    fs.glob('frameworks/*/*/package.json'),
  );

  let results = manifests.map((manifest) => path.dirname(manifest)).sort();

  if (FRAMEWORK && FRAMEWORK !== ALL) {
    results = results.filter((result) => result.includes(`/${FRAMEWORK}/`));
  }

  /**
   * Deliberately not filtered by `--bench`. These paths are app *folders*
   * (`one-item-many-updates`), and `--bench` takes a benchmark's display
   * name (`1 item, 1k updates`) -- the two never match, so filtering on it
   * emptied the list. The framework list should not depend on which
   * benchmark is selected either way.
   */
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
