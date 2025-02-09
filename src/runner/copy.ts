/**
 * For quickly (and interactively) creating variants of benchmarks
 *
 * (For local testing or otherwise)
 */
import fs from 'node:fs/promises';
import * as clack from '@clack/prompts';
import { getTests } from './repo.ts';
import assert from 'node:assert';

let tests = await getTests();

let frameworks = new Set<string>();
let benchNames = new Set<string>();

for (let test of tests) {
  let [, /* frameworks folder */ fw, name] = test.split('/');

  assert(fw, `Framework name missing for ${test}`);
  assert(name, `Bench name missing for ${test}`);

  frameworks.add(fw);
  benchNames.add(name);
}

let bench = await clack.select({
  message: 'Which bench to copy?',
  options: [...benchNames.values()].map((name) => {
    return { value: name, label: name };
  }),
});

if (clack.isCancel(bench)) {
  clack.log.info('Cancelled');
  process.exit(130);
}

let fws = await clack.multiselect({
  message: 'Which frameworks?',
  options: [...frameworks.values()].map((fw) => {
    return { value: fw, label: fw };
  }),
});

if (clack.isCancel(fws)) {
  clack.log.info('Cancelled');
  process.exit(130);
}

let newName = await clack.text({
  message: 'What is the name of the new bench?',
  validate(value) {
    if (value.length === 0) return `Value is required!`;
  },
});

if (clack.isCancel(newName)) {
  clack.log.info('Cancelled');
  process.exit(130);
}

for (let fw of fws) {
  let originalLocation = `frameworks/${fw}/${bench}`;
  let newLocation = `frameworks/${fw}/${newName}`;

  await fs.cp(originalLocation, newLocation, { recursive: true });
}

clack.log.success('Done!');
