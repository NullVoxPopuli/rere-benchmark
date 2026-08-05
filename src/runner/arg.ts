import { styleText } from 'node:util';

import { frameworks } from '../../results/app/frameworks.ts';

import type { VersionOverride } from '../../results/app/types.ts';

const [, , ...args] = process.argv;

/**
 * `--framework=all` / `--bench=all` selects everything,
 * instead of asking.
 */
export const ALL = 'all';

export const HEADLESS = bool('--headless');
export const COUNT = int('--count', 10);
export const CPU_THROTTLE = int('--cpu-throttle', 1);
export const FRAMEWORK = str('--framework');
export const BENCH_NAME = str('--bench');
export const BENCH_NAMES = strAll('--bench');
export const SKIP_BUILD = bool('--skip-build');
export const TIMEOUT = int('--timeout', 60_000);
export const INCLUDE_PRS = bool('--include-prs');
export const FILE = str('--file');
export const VERSION_OVERRIDES = versionOverrides();

function col1(name: string) {
  return styleText('yellow', name.padEnd(16));
}

function col2(value: unknown) {
  // the trailing space keeps a separator when the value overflows the pad
  return (String(value ?? '') + ' ').padEnd(10);
}

function col3(description: string) {
  return styleText('dim', description);
}

function row(...cols: string[]) {
  return cols.join('');
}

/**
 * The flags as this process resolved them -- printed by `pnpm bench` on
 * startup so a run's settings are always visible in its output.
 */
export function printFlagTable() {
  console.log(
    [
      `Flag            Value           Description`,
      `------------------------------------------------------------`,
      row(
        col1('--skip-build'),
        col2(SKIP_BUILD),
        col3('re-use an existing build'),
      ),
      row(
        col1('--cpu-throttle'),
        col2(CPU_THROTTLE),
        col3('x emulated CPU slowdown'),
      ),
      row(col1('--headless'), col2(HEADLESS), col3('limited to 60 fps')),
      row(col1('--count'), col2(COUNT), col3('sample count')),
      row(
        col1('--timeout'),
        col2(TIMEOUT),
        col3('ms a single sample may take'),
      ),
      row(col1('--framework'), col2(FRAMEWORK), col3(`or '${ALL}'`)),
      row(
        col1('--bench'),
        col2(BENCH_NAME),
        col3(`or '${ALL}'; repeatable to select several`),
      ),
      row(
        col1('--include-prs'),
        col2(INCLUDE_PRS),
        col3('record PRs merged since the previous result set'),
      ),
      row(
        col1('--file'),
        col2(FILE),
        col3('append to this result file, re-using its bench selection'),
      ),
      ...Object.entries(VERSION_OVERRIDES).map(([framework, override]) =>
        row(
          col1(`--${framework}`),
          col2(`#${override.number}`),
          col3(override.url),
        ),
      ),
    ]
      .map((line) => '\t' + line)
      .join('\n'),
  );
}

function bool(name: string) {
  return args.includes(name);
}

function str(name: string) {
  const arg = args.find((a) => a.startsWith(name));

  return arg?.split('=')[1];
}

/**
 * A flag that may be repeated -- `--bench=X --bench=Y` selects both.
 */
function strAll(name: string) {
  return args
    .filter((a) => a.split('=')[0] === name)
    .map((a) => a.split('=').slice(1).join('='))
    .filter(Boolean);
}

/**
 * Unlike {@link str}, `--ember` must not answer for `--ember-canary`.
 */
function exact(name: string) {
  const arg = args.find((a) => a.split('=')[0] === name);

  return arg?.split('=').slice(1).join('=');
}

/**
 * `--ember=<link to a PR>` (and the same for every other framework) records
 * which PR a framework's build came from -- as `pnpm use-tar-for` installs a
 * tarball, the installed version number is whatever the PR happened to be
 * branched from, and says nothing about what was measured.
 *
 * The results app links to the PR in place of that version.
 */
function versionOverrides() {
  const overrides: Record<string, VersionOverride> = {};

  for (const framework of Object.keys(frameworks)) {
    const value = exact(`--${framework}`);

    if (!value) continue;

    const override = toPullRequest(value);

    if (!override) {
      console.error(
        `--${framework}=${value} is not a pull request. ` +
          `Expected a link (https://github.com/emberjs/ember.js/pull/21514) ` +
          `or emberjs/ember.js#21514`,
      );
      process.exit(1);
    }

    overrides[framework] = override;
  }

  return overrides;
}

function toPullRequest(value: string): VersionOverride | undefined {
  const parsed = value
    .trim()
    .replace(/^(https?:\/\/)?(www\.)?github\.com\//, '')
    .match(/^(?<owner>[\w.-]+)\/(?<repo>[\w.-]+)(?:\/pull\/|#)(?<number>\d+)/);

  if (!parsed?.groups) return;

  const { owner, repo, number } = parsed.groups;

  return {
    number: Number(number),
    // rebuilt, so that a link copied from a /files or #discussion view still
    // points at the PR itself
    url: `https://github.com/${owner}/${repo}/pull/${number}`,
  };
}

function int(name: string, defaultValue: number) {
  const arg = args.find((a) => a.startsWith(name));

  if (!arg) return defaultValue;

  const str = arg.split('=')[1];

  if (!str) return defaultValue;

  const num = parseInt(str, 10);

  if (isNaN(num)) return defaultValue;

  return num;
}
