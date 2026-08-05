import assert from 'node:assert';
import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join } from 'node:path';

import { packageUp } from 'package-up';

import { frameworks } from '../../results/app/frameworks.ts';
import { info } from './environment.ts';

import type {
  FrameworkNotes,
  PullRequestNote,
  ResultData,
  ResultSet,
  Timing,
  VersionOverride,
} from '../../results/app/types.ts';
import type { BenchmarkInfo } from './benchmarks.ts';

const require = createRequire(import.meta.url);

/**
 * One captured performance.mark.
 *
 * The results app narrows `detail` to the number it reads off sampling
 * marks ("fps"); as captured it can be anything the page attached --
 * `:done` records `{ checks, via }`, most marks record nothing.
 */
export interface RecordedMark {
  /**
   * name of the performance.mark
   */
  name: string;
  /**
   * startTime of the performance.mark
   */
  at: number;
  /**
   * extra detail from the performance.mark
   *
   * (in the case of the dbmon test, this could be the FPS (for example))
   */
  detail?: unknown;
}

type RecordedBench = Omit<ResultData[string][string], 'times'> & {
  times: RecordedMark[][];
};

/**
 * A result file mid-write: the environment header is seeded when the file
 * is created, and everything else accretes as the run progresses. The
 * results app reads the finished file as {@link ResultSet}.
 */
type ResultFileData = Omit<
  ResultSet,
  'selections' | 'benchmarkInfo' | 'timing' | 'results'
> & {
  selections?: ResultSet['selections'];
  benchmarkInfo?: SavedBenchmarkInfo[];
  timing?: Timing;
  results: Record<string, Record<string, Partial<RecordedBench>>>;
};

type SavedBenchmarkInfo = Omit<BenchmarkInfo, 'ignoreCount'>;

/**
 * The file a run writes its results into -- everything that touches the
 * JSON on disk goes through here. Every save re-reads the file first, so
 * appending to a file another run already wrote keeps what it holds.
 */
export class ResultFile {
  readonly path: string;

  constructor(path: string) {
    this.path = path;
  }

  /**
   * Numbers in one file must be comparable, and hardware is part of the
   * measurement: appending runs from a different machine (or a different
   * monitor -- the frame-rate bench is capped by its refresh rate) would mix
   * results that cannot be compared.
   */
  async assertSameEnvironment() {
    if (!existsSync(this.path)) return;

    const file = await this.#read();
    const recorded = file.environment;

    if (!recorded) {
      return;
    }

    const current = info.environment;
    const mismatches: string[] = [];

    if (recorded.machine?.cpu !== current.machine.cpu) {
      mismatches.push(
        `cpu: ${recorded.machine?.cpu} vs ${current.machine.cpu}`,
      );
    }

    if (recorded.machine?.ram !== current.machine.ram) {
      mismatches.push(
        `ram: ${recorded.machine?.ram} vs ${current.machine.ram}`,
      );
    }

    if (recorded.monitor?.hz !== current.monitor.hz) {
      mismatches.push(
        `monitor: ${recorded.monitor?.hz}hz vs ${current.monitor.hz}hz`,
      );
    }

    assert(
      mismatches.length === 0,
      `${this.path} was recorded on different hardware (recorded vs now):\n` +
        mismatches.map((mismatch) => `  ${mismatch}`).join('\n'),
    );

    /**
     * Not hardware, so not fatal -- but an OS or browser update between runs
     * is still worth knowing about when reading the numbers later.
     */
    if (
      JSON.stringify(recorded.machine?.os) !==
      JSON.stringify(current.machine.os)
    ) {
      console.warn(
        `${this.path} was recorded on ${recorded.machine?.os?.name} ${recorded.machine?.os?.version}, ` +
          `this is ${current.machine.os.name} ${current.machine.os.version}`,
      );
    }

    if (JSON.stringify(recorded.browser) !== JSON.stringify(current.browser)) {
      console.warn(
        `${this.path} was recorded with ${recorded.browser?.name} ${recorded.browser?.version}, ` +
          `this is ${current.browser.name} ${current.browser.version}`,
      );
    }
  }

  async saveTiming(timing: Timing) {
    const file = await this.#read();

    file.timing = timing;

    await this.#write(file);
  }

  /**
   * What a run selected, and the descriptor for each bench it ran.
   *
   * Merged in, so appending a partial run (`--framework preact`, say) to an
   * existing file keeps the runs already in it. The results app renders
   * exactly what `selections` lists rather than what `results` holds, so
   * replacing it hid every framework but the one just appended.
   */
  async saveBenchmarkInfo(selected: {
    benches: BenchmarkInfo[];
    frameworks: string[];
  }) {
    const file = await this.#read();

    const benches: SavedBenchmarkInfo[] = selected.benches.map((bench) => {
      // ignoreCount is only used for the runner
      const { ignoreCount: _, ...rest } = bench;

      return rest;
    });

    file.selections = {
      benches: union(
        file.selections?.benches,
        benches.map((bench) => bench.name),
      ),
      frameworks: union(file.selections?.frameworks, selected.frameworks),
    };

    file.benchmarkInfo = mergeBenchmarkInfo(file.benchmarkInfo, benches);

    await this.#write(file);
  }

  /**
   * Which PR each framework's build came from, when it came from one.
   * Merged in, so appending to an existing file keeps the runs already in it.
   */
  async saveVersionOverrides(overrides: Record<string, VersionOverride>) {
    if (Object.keys(overrides).length === 0) return;

    const file = await this.#read();

    file.versionOverrides = { ...file.versionOverrides, ...overrides };

    await this.#write(file);
  }

  /**
   * Per-framework notes, collected from `frameworks/<framework>/notes.json`
   * when present, keyed by framework name. Lets a run carry small labels the
   * results app shows -- e.g. Vue's `{ "variant": "Vapor" }`. Merged in, so
   * appending to an existing file keeps notes already written to it.
   */
  async saveNotes(frameworks: string[]) {
    const notes: Record<string, FrameworkNotes> = {};

    for (const framework of frameworks) {
      const notePath = join('frameworks', framework, 'notes.json');

      if (!existsSync(notePath)) continue;

      notes[framework] = (await readJSON(notePath)) as FrameworkNotes;
    }

    if (Object.keys(notes).length === 0) return;

    const file = await this.#read();

    file.notes = { ...file.notes, ...notes } as NonNullable<
      ResultFileData['notes']
    >;

    await this.#write(file);
  }

  /**
   * The PRs that landed between the previous result set and this run
   * (`--include-prs`, from git history). Merged in and deduplicated by URL,
   * so hand-added entries (plain URL strings) and earlier appends survive.
   */
  async savePrNotes(prs: PullRequestNote[]) {
    if (prs.length === 0) return;

    const file = await this.#read();

    const existing: Array<string | PullRequestNote> = file.notes?.prs ?? [];
    const known = new Set(
      existing.map((pr) => (typeof pr === 'string' ? pr : pr.url)),
    );
    const fresh = prs.filter((pr) => !known.has(pr.url));

    // SAFETY: `notes` mixes an index signature with the `prs` key, which
    // no object literal satisfies without help
    file.notes = {
      ...file.notes,
      prs: existing.concat(fresh),
    } as NonNullable<ResultFileData['notes']>;

    await this.#write(file);
  }

  /**
   * Starts a framework x bench pair over: whatever the file held for the
   * pair is replaced, so re-running one framework overwrites its old runs.
   */
  async prepareFor(framework: string, bench: BenchmarkInfo) {
    const file = await this.#read();
    const version = await versionOf(framework, bench);

    file.results[framework] ??= {};
    file.results[framework][bench.name] = {
      app: bench.app,
      query: bench.query,
      version,
      times: [],
    };

    await this.#write(file);
  }

  async addResult(
    framework: string,
    benchName: string,
    marks: RecordedMark[],
    benchInfo: BenchmarkInfo,
  ) {
    const file = await this.#read();

    const byFramework = (file.results[framework] ??= {});
    const bench = (byFramework[benchName] ??= {});

    bench.times ??= [];
    bench.times.push(marks);

    if (benchInfo.measure) {
      bench.measure = benchInfo.measure;
    }

    if (benchInfo.whatsBetter) {
      bench.whatsBetter = benchInfo.whatsBetter;
    }

    await this.#write(file);
  }

  async #read(): Promise<ResultFileData> {
    if (!existsSync(this.path)) {
      return {
        ...info,
        results: {},
      };
    }

    const buffer = await fs.readFile(this.path);

    return JSON.parse(buffer.toString()) as ResultFileData;
  }

  async #write(file: ResultFileData) {
    await fs.writeFile(this.path, JSON.stringify(file, null, 2));
  }
}

/**
 * `existing` in the order it already has, then whatever `fresh` adds.
 */
function union<T>(existing: T[] | undefined, fresh: T[]) {
  return Array.from(new Set(existing ?? []).union(new Set(fresh)));
}

/**
 * By name, with this run's descriptor winning for a bench it re-ran.
 */
function mergeBenchmarkInfo(
  existing: SavedBenchmarkInfo[] | undefined,
  fresh: SavedBenchmarkInfo[],
) {
  const byName = new Map(
    (existing ?? []).map((bench) => [bench.name, bench] as const),
  );

  for (const bench of fresh) {
    byName.set(bench.name, bench);
  }

  return Array.from(byName.values());
}

async function readJSON(filePath: string) {
  const buffer = await fs.readFile(filePath);
  const json = JSON.parse(buffer.toString());

  return json;
}

/**
 * The installed version of the framework's package in the bench's app,
 * resolved from the app's own node_modules -- each app has its own
 * lockfile, so versions can differ between apps (and shouldn't).
 */
async function versionOf(framework: string, bench: BenchmarkInfo) {
  const dir = join('frameworks', framework, bench.app);
  const manifestPath = join(dir, 'package.json');
  const packageName = frameworks[framework]?.package;

  assert(
    packageName,
    `Could not find framework (${framework}) in the frameworks.ts file`,
  );

  let entry: string;

  try {
    entry = require.resolve(packageName, { paths: [dir] });
  } catch {
    // if the '.' is not listed in exports, the above will fail
    entry = require.resolve(`${packageName}/package.json`, { paths: [dir] });
  }

  const packageManifestPath = await packageUp({ cwd: entry });

  assert(
    packageManifestPath,
    `The package, ${packageName}, does not have a package.json. This is required.`,
  );

  const dependencyManifest = await readJSON(packageManifestPath);
  const version = dependencyManifest.version;

  assert(
    version,
    `Could not find version for ${packageName} in ${manifestPath}`,
  );

  return version;
}
