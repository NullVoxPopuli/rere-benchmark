/**
 * Installs a tarball (as made by `npm pack`) in every app of a framework.
 *
 * This is how we benchmark an unpublished version of a framework --
 * a PR, a local build, a nightly, etc.
 *
 *   pnpm use-tar-for ember ./path-to/tar.tgz
 *
 * The tarball is copied to the root of the repo (once), and each app
 * references it from there -- pnpm resolves `file:` dependencies relative
 * to the package that declares them, so each app gets its own relative path
 * to the one tarball.
 */
import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';

import * as clack from '@clack/prompts';
import { $ } from 'execa';
import { globby } from 'globby';

const [, , framework, tarball] = process.argv;

if (!framework || !tarball) {
  clack.log.error(`Usage: pnpm use-tar-for <framework> <path-to-tarball>`);
  process.exit(1);
}

/**
 * `pnpm run` moves us to the package directory,
 * so relative paths from the user's shell need INIT_CWD to resolve.
 */
const tarPath = path.resolve(process.env['INIT_CWD'] ?? process.cwd(), tarball);

if (!existsSync(tarPath)) {
  clack.log.error(`No tarball at ${tarPath}`);
  process.exit(1);
}

const appDirs = (
  await globby(`frameworks/${framework}/*/package.json`, { gitignore: true })
)
  .map((manifest) => path.dirname(manifest))
  .sort();

if (appDirs.length === 0) {
  const available = await fs.readdir('frameworks');

  clack.log.error(
    `No apps found for "${framework}". Available frameworks: ${available.join(', ')}`,
  );
  process.exit(1);
}

const tarName = path.basename(tarPath);
const rootCopy = path.resolve(tarName);

if (rootCopy !== tarPath) {
  await fs.copyFile(tarPath, rootCopy);
}

for (const dir of appDirs) {
  /**
   * Relative to the app, because that's what pnpm writes in to the app's
   * package.json -- and what it resolves from when installing.
   */
  const specifier = path.relative(path.resolve(dir), rootCopy);

  clack.log.info(`Installing ${specifier} in ${dir}`);

  await $({
    preferLocal: true,
    cwd: dir,
    stdio: 'inherit',
  })`pnpm add ${specifier}`;
}

clack.log.success(
  `Installed ${tarName} in ${appDirs.length} ${framework} apps`,
);
