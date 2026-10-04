import { existsSync } from 'node:fs';
import {
  appendFile,
  copyFile,
  mkdir,
  readdir,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { gzip } from 'node:zlib';

import type { Page } from 'puppeteer';

/**
 * `--profile=<dir>` records a CPU profile of every sample, cut to the time
 * between `:start` and `:done`.
 *
 * The profile comes from a Chrome trace and not from the `Profiler` domain:
 * a trace has the user timing marks and the profiler samples on one clock,
 * so the cut is exact.
 *
 * Profiling costs time on the main thread, so a profiled run is only
 * comparable with other profiled runs. The result file records the flag.
 */
const CATEGORIES = [
  '-*',
  'blink.user_timing',
  'disabled-by-default-v8.cpu_profiler',
];

export async function startProfile(page: Page) {
  await page.tracing.start({ categories: CATEGORIES });
}

export async function stopProfile(page: Page): Promise<Uint8Array> {
  const trace = await page.tracing.stop();

  if (!trace) {
    throw new Error(`The trace for this sample came back empty`);
  }

  return trace;
}

interface TraceEvent {
  name: string;
  cat?: string;
  ph: string;
  pid: number;
  tid: number;
  ts: number;
  id?: string;
  args?: any;
}

interface CallFrame {
  functionName: string;
  url?: string;
  lineNumber?: number;
  columnNumber?: number;
}

interface ProfileNode {
  id: number;
  parent?: number;
  callFrame: CallFrame;
}

export interface ProfileSample {
  /**
   * `:done` minus `:start`, from the trace clock
   */
  wallMs: number;
  /**
   * Time covered by profiler samples inside the window
   */
  sampledMs: number;
  /**
   * Self time per frame. Keys come from {@link frameKey}.
   */
  self: Record<string, number>;
  /**
   * Every frame that a stack below refers to, as {@link frameKey}s
   */
  frames: string[];
  /**
   * Time per stack. A stack is the indexes into `frames`, root first,
   * joined with `;`.
   */
  stacks: Record<string, number>;
}

/**
 * `name|url|line|column` -- the line and column are 0-based, as the
 * profiler reports them, and point at the start of the function.
 */
function frameKey(frame: CallFrame) {
  // the port changes between apps, the path does not
  const url = (frame.url ?? '').replace(/^https?:\/\/[^/]+/, '');

  return `${frame.functionName}|${url}|${frame.lineNumber ?? -1}|${frame.columnNumber ?? -1}`;
}

export function summarize(trace: Uint8Array): ProfileSample {
  const { traceEvents } = JSON.parse(new TextDecoder().decode(trace)) as {
    traceEvents: TraceEvent[];
  };

  const mark = (name: string) =>
    traceEvents.find(
      (event) =>
        event.name === name && event.cat?.includes('blink.user_timing'),
    );

  const start = mark(':start');
  const done = mark(':done');

  if (!start || !done) {
    throw new Error(`The trace has no :start or :done mark`);
  }

  // The page's main thread made the marks. Its profile is the one in the
  // same process; worker and other renderer profiles are left out.
  const profile = traceEvents.find(
    (event) => event.name === 'Profile' && event.pid === start.pid,
  );

  if (!profile) {
    throw new Error(`The trace has no CPU profile for the page`);
  }

  const nodes = new Map<number, ProfileNode>();
  const times: number[] = [];
  const sampleNodes: number[] = [];
  let time: number = profile.args.data.startTime;

  for (const event of traceEvents) {
    if (event.name !== 'ProfileChunk') continue;
    if (event.pid !== profile.pid || event.id !== profile.id) continue;

    const data = event.args.data;

    for (const node of data.cpuProfile?.nodes ?? []) {
      nodes.set(node.id, node);
    }

    const samples: number[] = data.cpuProfile?.samples ?? [];
    const deltas: number[] = data.timeDeltas ?? [];

    for (let i = 0; i < samples.length; i++) {
      time += deltas[i] ?? 0;
      times.push(time);
      sampleNodes.push(samples[i]!);
    }
  }

  const frames: string[] = [];
  const frameIndexes = new Map<string, number>();
  const stackKeys = new Map<number, string>();

  const indexOf = (frame: string) => {
    let index = frameIndexes.get(frame);

    if (index === undefined) {
      index = frames.push(frame) - 1;
      frameIndexes.set(frame, index);
    }

    return index;
  };

  const stackOf = (id: number): string => {
    let key = stackKeys.get(id);

    if (key !== undefined) return key;

    const node = nodes.get(id);

    if (!node) return '';

    const parent = node.parent === undefined ? '' : stackOf(node.parent);
    const frame = indexOf(frameKey(node.callFrame));

    key = parent ? `${parent};${frame}` : `${frame}`;
    stackKeys.set(id, key);

    return key;
  };

  const self: Record<string, number> = {};
  const stacks: Record<string, number> = {};
  let sampledMs = 0;

  // A sample stands for the time until the next one.
  for (let i = 0; i < times.length - 1; i++) {
    const from = Math.max(times[i]!, start.ts);
    const to = Math.min(times[i + 1]!, done.ts);

    if (to <= from) continue;

    const ms = (to - from) / 1000;
    const node = nodes.get(sampleNodes[i]!);

    if (!node) continue;

    const key = frameKey(node.callFrame);
    const stack = stackOf(node.id);

    self[key] = (self[key] ?? 0) + ms;
    stacks[stack] = (stacks[stack] ?? 0) + ms;
    sampledMs += ms;
  }

  return {
    wallMs: (done.ts - start.ts) / 1000,
    sampledMs,
    self,
    frames,
    stacks,
  };
}

function slug(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * One JSON Lines file per bench, one line per sample, and the full trace of
 * the first sample next to it, for a flame chart in DevTools or Perfetto.
 */
export async function saveProfile(
  dir: string,
  framework: string,
  benchName: string,
  trace: Uint8Array,
) {
  const folder = join(dir, framework);
  const base = join(folder, slug(benchName));

  await mkdir(folder, { recursive: true });

  const sample = summarize(trace);

  await appendFile(`${base}.jsonl`, JSON.stringify(sample) + '\n');

  if (!existsSync(`${base}.trace.json.gz`)) {
    await writeFile(`${base}.trace.json.gz`, await promisify(gzip)(trace));
  }

  return sample;
}

/**
 * Starts the bench's file over, so that a re-run replaces it.
 */
export async function resetProfile(
  dir: string,
  framework: string,
  benchName: string,
) {
  const base = join(dir, framework, slug(benchName));

  await mkdir(join(dir, framework), { recursive: true });
  await writeFile(`${base}.jsonl`, '');
  await rm(`${base}.trace.json.gz`, { force: true });
}

/**
 * The profile names minified frames. The source maps translate them back,
 * but the next build replaces `dist`, so they are copied now.
 */
export async function saveSourceMaps(
  dir: string,
  framework: string,
  distDir: string,
) {
  const assets = join(distDir, 'assets');

  if (!existsSync(assets)) return;

  const target = join(dir, framework, 'maps');

  await mkdir(target, { recursive: true });

  for (const file of await readdir(assets)) {
    if (!file.endsWith('.map')) continue;

    await copyFile(join(assets, file), join(target, file));
  }
}

export async function readProfile(file: string): Promise<ProfileSample[]> {
  const text = await readFile(file, 'utf8');

  return text
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line) as ProfileSample);
}
