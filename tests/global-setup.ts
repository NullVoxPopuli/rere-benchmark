import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { REPO_ROOT, FRAMEWORKS, BENCHES, appDir } from './helpers';

const run = promisify(execFile);

const CONCURRENCY = 4;

/**
 * Installs and builds every app so the specs can serve their dists.
 *
 * Skip with SKIP_BUILD=1 when iterating locally against already-built
 * apps.
 */
export default async function globalSetup() {
  if (process.env.SKIP_BUILD) {
    console.log('SKIP_BUILD set: not installing/building apps');
    return;
  }

  // apps link to common; its deps must exist first (pnpm does not
  // install dependencies *of* linked packages)
  await pnpm(join(REPO_ROOT, 'common'), ['install']);

  const dirs: string[] = [];

  for (const framework of FRAMEWORKS) {
    for (const bench of BENCHES) {
      dirs.push(appDir(framework, bench.app));
    }
  }

  let failures: string[] = [];
  let queue = dirs.entries();

  async function worker() {
    for (const [, dir] of queue) {
      try {
        await pnpm(dir, ['install']);
        await pnpm(dir, ['build']);
        console.log(`built ${dir.replace(REPO_ROOT, '')}`);
      } catch (error) {
        failures.push(
          `${dir}: ${error instanceof Error ? error.message : error}`,
        );
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  if (failures.length > 0) {
    throw new Error(`Some apps failed to build:\n${failures.join('\n')}`);
  }

  for (const dir of dirs) {
    if (!existsSync(join(dir, 'dist', 'index.html'))) {
      throw new Error(`${dir} has no dist/index.html after building`);
    }
  }
}

async function pnpm(cwd: string, args: string[]) {
  await run('pnpm', args, { cwd, maxBuffer: 10 * 1024 * 1024 });
}
