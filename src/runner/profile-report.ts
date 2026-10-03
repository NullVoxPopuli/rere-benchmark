/**
 * `pnpm profile:report <dir> [--base=<dir>] [--framework=<name>] [--top=<n>]`
 *
 * Reads the profiles that `pnpm bench --profile=<dir>` wrote and prints, per
 * bench, where the time between `:start` and `:done` went: self time and
 * inclusive time per function, and self time per package. With `--base`, it
 * prints the change against another profiled run instead.
 *
 * Frames are translated through the copied source maps, so two runs with
 * different bundles still line up by function.
 */
import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { basename, join } from 'node:path';

import {
  originalPositionFor,
  sourceContentFor,
  TraceMap,
} from '@jridgewell/trace-mapping';

import { readProfile } from './profile.ts';

const [, , ...args] = process.argv;

function option(name: string) {
  return args
    .find((arg) => arg.startsWith(`--${name}=`))
    ?.split('=')
    .slice(1)
    .join('=');
}

const dir = args.find((arg) => !arg.startsWith('--'));
const baseDir = option('base');
const onlyFramework = option('framework');
const top = Number(option('top') ?? 15);

if (!dir) {
  console.error(
    `Usage: pnpm profile:report <dir> [--base=<dir>] [--framework=<name>] [--top=<n>]`,
  );
  process.exit(1);
}

interface Frame {
  /**
   * Function name and source location, the same across bundles
   */
  label: string;
  /**
   * Package, or the harness, the app, native code, or a VM state
   */
  group: string;
}

/**
 * The source of a map entry, shortened to the part that names the code:
 * `ember-source/@glimmer/runtime/index.js`, `common/src/...`, `app/...`.
 */
function shortSource(source: string) {
  const ember = source.match(
    /ember-source\/dist\/(?:prod|dev)\/packages\/(.*)$/,
  );

  if (ember) return `ember-source/${ember[1]}`;

  const nodeModules = source.lastIndexOf('node_modules/');

  if (nodeModules !== -1)
    return source.slice(nodeModules + 'node_modules/'.length);

  const common = source.indexOf('common/');

  if (common !== -1) return source.slice(common);

  return source.replace(/^(\.\.\/)+/, '');
}

/**
 * Bundlers add a content hash to chunk names, `tracked-JcbMdnul.js`, which
 * changes with every build. Without it, two builds line up.
 */
function withoutHash(source: string) {
  return source.replace(/-[\w-]{8}\.js$/, '.js');
}

/**
 * The profiler points at the start of a function. Its name is on that line
 * of the original source: `function set(`, `get value(`, `run(`, `x = (`.
 */
function nameAt(line: string | undefined, column: number) {
  if (!line) return undefined;

  const text = line.slice(Math.max(0, column - 60), column + 80);
  const patterns = [
    /function\*?\s+([\w$]+)\s*\(/,
    /(?:get|set|static|async)\s+([\w$#]+)\s*\(/,
    /([\w$#]+)\s*[:=]\s*(?:async\s*)?(?:function\b|\([^)]*\)\s*=>|[\w$]+\s*=>)/,
    /^\s*([\w$#]+)\s*\([^)]*\)\s*\{/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (match) return match[1];
  }

  return undefined;
}

function groupOf(source: string) {
  if (source.startsWith('ember-source/shared-chunks/')) {
    return `ember-source ${basename(source, '.js')}`;
  }

  if (source.startsWith('ember-source/')) {
    const parts = source.slice('ember-source/'.length).split('/');

    return `ember-source ${parts[0]!.startsWith('@') ? `${parts[0]}/${parts[1]}` : parts[0]!}`;
  }

  if (source.startsWith('common/')) return 'common (harness)';
  if (source.startsWith('app/')) return 'app';

  const parts = source.split('/');

  return parts[0]!.startsWith('@') ? `${parts[0]}/${parts[1]}` : parts[0]!;
}

class Symbolicator {
  #maps = new Map<string, TraceMap | null>();
  #frames = new Map<string, Frame>();

  #mapsDir: string;

  constructor(mapsDir: string) {
    this.#mapsDir = mapsDir;
  }

  async #map(file: string) {
    if (!this.#maps.has(file)) {
      const path = join(this.#mapsDir, `${file}.map`);

      this.#maps.set(
        file,
        existsSync(path) ? new TraceMap(await readFile(path, 'utf8')) : null,
      );
    }

    return this.#maps.get(file) ?? null;
  }

  async frame(key: string): Promise<Frame> {
    const cached = this.#frames.get(key);

    if (cached) return cached;

    const [name = '', url = '', lineText = '-1', columnText = '-1'] =
      key.split('|');
    const line = Number(lineText);
    const column = Number(columnText);
    let frame: Frame;

    if (!url) {
      frame = name.startsWith('(')
        ? { label: name, group: name }
        : { label: `${name} (native)`, group: '(native)' };
    } else {
      const map = await this.#map(basename(url));
      const position =
        map && line >= 0
          ? originalPositionFor(map, { line: line + 1, column })
          : null;

      if (map && position?.source) {
        const source = withoutHash(shortSource(position.source));
        const content = sourceContentFor(map, position.source);
        const originalName = nameAt(
          content?.split('\n')[position.line - 1],
          position.column,
        );

        // The name and file tell functions apart without the line number,
        // which moves between builds. A minified name changes with every
        // build, so an unnamed function keeps its original line instead.
        const known = originalName ?? position.name;

        frame = {
          label: known
            ? `${known} ${source}`
            : `(anonymous) ${source}:${position.line}`,
          group: groupOf(source),
        };
      } else {
        frame = {
          label: `${name || '(anonymous)'} ${basename(url)}:${line + 1}`,
          group: basename(url),
        };
      }
    }

    this.#frames.set(key, frame);

    return frame;
  }
}

interface BenchSummary {
  samples: number;
  wallMs: number;
  sampledMs: number;
  self: Map<string, number>;
  inclusive: Map<string, number>;
  groups: Map<string, number>;
}

function add(map: Map<string, number>, key: string, value: number) {
  map.set(key, (map.get(key) ?? 0) + value);
}

async function summarizeBench(
  file: string,
  symbols: Symbolicator,
): Promise<BenchSummary> {
  const samples = await readProfile(file);
  const summary: BenchSummary = {
    samples: samples.length,
    wallMs: 0,
    sampledMs: 0,
    self: new Map(),
    inclusive: new Map(),
    groups: new Map(),
  };

  for (const sample of samples) {
    summary.wallMs += sample.wallMs / samples.length;
    summary.sampledMs += sample.sampledMs / samples.length;

    for (const [key, ms] of Object.entries(sample.self)) {
      const frame = await symbols.frame(key);

      add(summary.self, frame.label, ms / samples.length);
      add(summary.groups, frame.group, ms / samples.length);
    }

    const labels = await Promise.all(
      sample.frames.map((key) => symbols.frame(key)),
    );

    for (const [stack, ms] of Object.entries(sample.stacks)) {
      // a recursive function counts once per stack
      const seen = new Set<string>();

      for (const index of stack.split(';')) {
        const label = labels[Number(index)]!.label;

        if (seen.has(label)) continue;

        seen.add(label);
        add(summary.inclusive, label, ms / samples.length);
      }
    }
  }

  return summary;
}

async function summarizeDir(root: string) {
  const result = new Map<string, Map<string, BenchSummary>>();

  for (const framework of await readdir(root)) {
    if (onlyFramework && framework !== onlyFramework) continue;

    const folder = join(root, framework);
    const symbols = new Symbolicator(join(folder, 'maps'));
    const benches = new Map<string, BenchSummary>();

    for (const file of (await readdir(folder)).sort()) {
      if (!file.endsWith('.jsonl')) continue;

      benches.set(
        file.replace(/\.jsonl$/, ''),
        await summarizeBench(join(folder, file), symbols),
      );
    }

    result.set(framework, benches);
  }

  return result;
}

function ms(value: number) {
  return value >= 100
    ? value.toFixed(0)
    : value >= 10
      ? value.toFixed(1)
      : value.toFixed(2);
}

function pct(part: number, whole: number) {
  return whole > 0 ? `${((part / whole) * 100).toFixed(1)}%` : '-';
}

function topOf(map: Map<string, number>, n: number) {
  const entries: Array<[string, number]> = [];

  for (const entry of map) entries.push(entry);

  return entries.sort((a, b) => b[1] - a[1]).slice(0, n);
}

function printSingle(name: string, bench: BenchSummary) {
  console.log(`\n## ${name}`);
  console.log(
    `${bench.samples} samples, wall ${ms(bench.wallMs)} ms, profiled ${ms(bench.sampledMs)} ms per sample`,
  );

  console.log(`\nself time by group`);

  for (const [group, value] of topOf(bench.groups, 10)) {
    console.log(
      `  ${ms(value).padStart(8)} ms ${pct(value, bench.sampledMs).padStart(6)}  ${group}`,
    );
  }

  console.log(`\nself time by function`);

  for (const [label, value] of topOf(bench.self, top)) {
    console.log(
      `  ${ms(value).padStart(8)} ms ${pct(value, bench.sampledMs).padStart(6)}  ${label}`,
    );
  }

  console.log(`\ninclusive time by function`);

  for (const [label, value] of topOf(bench.inclusive, top)) {
    console.log(
      `  ${ms(value).padStart(8)} ms ${pct(value, bench.sampledMs).padStart(6)}  ${label}`,
    );
  }
}

function printDiffSection(
  title: string,
  before: Map<string, number>,
  after: Map<string, number>,
) {
  const rows: Array<{ key: string; before: number; after: number }> = [];

  for (const [key, value] of before) {
    rows.push({ key, before: value, after: after.get(key) ?? 0 });
  }

  for (const [key, value] of after) {
    if (!before.has(key)) rows.push({ key, before: 0, after: value });
  }

  rows.sort(
    (a, b) => Math.abs(b.after - b.before) - Math.abs(a.after - a.before),
  );
  rows.length = Math.min(rows.length, top);

  console.log(`\n${title} (largest changes)`);

  for (const row of rows) {
    const delta = row.after - row.before;

    console.log(
      `  ${ms(row.before).padStart(8)} -> ${ms(row.after).padStart(8)} ms  ${(delta >= 0 ? '+' : '') + ms(delta)}  ${row.key}`,
    );
  }
}

function printDiff(name: string, before: BenchSummary, after: BenchSummary) {
  console.log(`\n## ${name}`);
  console.log(
    `wall ${ms(before.wallMs)} -> ${ms(after.wallMs)} ms (${pct(after.wallMs - before.wallMs, before.wallMs)}), profiled ${ms(before.sampledMs)} -> ${ms(after.sampledMs)} ms`,
  );

  printDiffSection('self time by group', before.groups, after.groups);
  printDiffSection('self time by function', before.self, after.self);
  printDiffSection(
    'inclusive time by function',
    before.inclusive,
    after.inclusive,
  );
}

const current = await summarizeDir(dir);
const base = baseDir ? await summarizeDir(baseDir) : undefined;

for (const [framework, benches] of current) {
  console.log(`\n# ${framework}${base ? ` (base: ${baseDir})` : ''}`);

  for (const [name, bench] of benches) {
    const before = base?.get(framework)?.get(name);

    if (base && !before) {
      console.log(`\n## ${name}\n(not in the base run)`);
    } else if (before) {
      printDiff(name, before, bench);
    } else {
      printSingle(name, bench);
    }
  }
}
