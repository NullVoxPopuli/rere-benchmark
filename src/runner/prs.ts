import { readdir, readFile } from 'node:fs/promises';
import { basename, join } from 'node:path';

import { $ } from 'execa';

import type { PullRequestNote } from '../../results/app/types.ts';

const RESULTS_DIR = './results/public/results';

/**
 * Same base the results app links shas to.
 */
const REPO_URL = 'https://github.com/NullVoxPopuli/rere-benchmark';

/**
 * When the most recent result set (other than the one being written) was
 * recorded. Result files are numbered, and each one records its run date
 * in its `date` field -- so every file has to be opened.
 */
async function previousResultSetDate(currentFilePath: string) {
  const files = await readdir(RESULTS_DIR);
  const current = basename(currentFilePath);

  let newest: string | undefined;

  for (const file of files) {
    if (!file.endsWith('.json') || file === current) continue;

    const buffer = await readFile(join(RESULTS_DIR, file));
    const json = JSON.parse(buffer.toString());
    const date: unknown = json.date;

    if (typeof date !== 'string' || Number.isNaN(Date.parse(date))) continue;

    if (!newest || new Date(date) > new Date(newest)) {
      newest = date;
    }
  }

  return newest;
}

/**
 * The PRs that landed between the previous result set and now, from git
 * history alone (no GitHub API):
 *
 * - a merge commit's subject is `Merge pull request #N from ...` and the
 *   first line of its body is the PR title
 * - a squash-merge's subject is `The PR title (#N)`
 *
 * Newest first, like `git log`. Deduplicated by number, so a PR that
 * appears both ways (or twice via --since's commit-date filter) is
 * recorded once.
 */
export async function prsSinceLastResultSet(currentFilePath: string) {
  const since = await previousResultSetDate(currentFilePath);

  if (!since) return;

  // NUL between subject and body, RS between commits: bodies span lines
  const format = '%s%x00%b%x1e';
  const { stdout } = await $`git log --since=${since} --format=${format}`;

  const prs: PullRequestNote[] = [];
  const seen = new Set<string>();

  for (const entry of stdout.split('\x1e')) {
    const [subject = '', body = ''] = entry.trim().split('\0');

    const pr = fromMergeCommit(subject, body) ?? fromSquashCommit(subject);

    if (!pr) continue;
    if (seen.has(pr.url)) continue;

    seen.add(pr.url);
    prs.push(pr);
  }

  return { since, prs };
}

function fromMergeCommit(
  subject: string,
  body: string,
): PullRequestNote | undefined {
  const merge = subject.match(/^Merge pull request #(?<number>\d+) from /);

  if (!merge?.groups) return;

  const title = body
    .split('\n')
    .map((line) => line.trim())
    .find(Boolean);

  return {
    url: `${REPO_URL}/pull/${merge.groups['number']}`,
    ...(title ? { title } : {}),
  };
}

function fromSquashCommit(subject: string): PullRequestNote | undefined {
  const squash = subject.match(/^(?<title>.+) \(#(?<number>\d+)\)$/);

  if (!squash?.groups) return;

  return {
    url: `${REPO_URL}/pull/${squash.groups['number']}`,
    title: squash.groups['title'],
  };
}
