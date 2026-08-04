import { assert, warn } from "@ember/debug";

import { experiments } from "virtual:result-sets";

import { frameworks } from "#frameworks";
import {
  asyncBenchesLast,
  formatRunName,
  higherIsBetterBenches,
  isBiggerBetter,
  isoOf,
  lowerIsBetterBenches,
  round,
  shortRunName,
  throttleLabel,
  titleOf,
} from "#utils";

import type { BenchmarkInfo, Mark, Results, ResultSetData, VersionOverride } from "#types";
import type { Percentile, TotalSort } from "#utils";

export interface DisplayPr {
  url: string;
  title?: string;
  /**
   * `#<number>` when the URL has one, the URL itself otherwise.
   */
  label: string;
}

/**
 * One benchmark run: the raw JSON plus everything the app asks of it.
 */
export class ResultSet {
  static async fetch(name: string): Promise<ResultSet> {
    // experiments live in a separate directory from the official runs
    const dir = experiments.includes(name) ? "experiments" : "results";
    const response = await fetch(`/${dir}/${name}.json`);
    const data = (await response.json()) as ResultSetData;

    return new ResultSet(name, data);
  }

  readonly name: string;
  readonly data: ResultSetData;

  constructor(name: string, data: ResultSetData) {
    this.name = name;
    this.data = data;
    this.#warnOnVersionDivergence();
  }

  get date() {
    return this.data.date;
  }

  get sha() {
    return this.data.sha;
  }

  get timing() {
    return this.data.timing;
  }

  get environment() {
    return this.data.environment;
  }

  get benchmarkInfo() {
    return this.data.benchmarkInfo;
  }

  /**
   * Every framework the run recorded results for.
   */
  get frameworks(): string[] {
    return Object.keys(this.data.results);
  }

  /**
   * The frameworks the run was asked to benchmark, in recorded order --
   * what the app renders, whether or not results exist for each.
   */
  get selectedFrameworks(): string[] {
    return this.data.selections.frameworks;
  }

  get orderedBenches() {
    return asyncBenchesLast(this.benchmarkInfo);
  }

  get higherBenches() {
    return higherIsBetterBenches(this.benchmarkInfo);
  }

  get lowerBenches() {
    return lowerIsBetterBenches(this.benchmarkInfo);
  }

  get cpuThrottle() {
    return this.data.args?.CPU_THROTTLE;
  }

  get throttleLabel() {
    return throttleLabel(this.cpuThrottle);
  }

  hasSameThrottleAs = (other: ResultSet) =>
    (this.cpuThrottle ?? null) === (other.cpuThrottle ?? null);

  get displayName() {
    return formatRunName(this.name);
  }

  get shortName() {
    return shortRunName(this.name);
  }

  /**
   * When the run started (ISO 8601), for `<time datetime>`.
   */
  get iso() {
    return isoOf(this.name);
  }

  /**
   * The tooltip behind the displayed run name: the machine's CPU model.
   */
  get tooltip() {
    return titleOf(this.name);
  }

  /**
   * The PRs the run recorded (the ones that landed between the previous
   * result set and the run), normalized for display: the runner records
   * `{ url, title }`, hand-added entries are plain URL strings.
   */
  get prs(): DisplayPr[] {
    const prs = this.data.notes?.prs ?? [];

    return prs.map((pr) => {
      const url = typeof pr === "string" ? pr : pr.url;
      const title = typeof pr === "string" ? undefined : pr.title;
      const number = url.match(/\/pull\/(\d+)/)?.[1];

      return { url, title, label: number ? `#${number}` : url };
    });
  }

  /**
   * The version the run used for a framework.
   */
  versionOf = (framework: string) => Array.from(this.#versionsOf(framework))[0];

  /**
   * A label to show in place of the version, when the run was built from
   * something that doesn't have one -- a PR, say.
   */
  overrideOf = (framework: string): VersionOverride | undefined =>
    this.data.versionOverrides?.[framework];

  /**
   * The variant the run recorded for a framework, if any -- e.g. "Vapor"
   * for a Vue Vapor build. Shown under the framework's name, above its
   * version.
   */
  variantOf = (framework: string) => this.data.notes?.[framework]?.variant;

  /**
   * How one framework did at one benchmark, or undefined when the run
   * doesn't have the pair.
   */
  timeFor = (framework: string, bench: BenchmarkInfo, percentile: Percentile) => {
    const recorded = this.data.results[framework]?.[bench.name];

    if (!recorded) return;

    return timeFromMarks(recorded.times, bench.measure, percentile, isBiggerBetter(bench));
  };

  /**
   * Every measured value for one framework at one bench, in run order;
   * empty when the run doesn't have the pair.
   */
  samplesFor = (framework: string, bench: BenchmarkInfo): number[] => {
    const recorded = this.data.results[framework]?.[bench.name];

    return recorded ? samplesOf(recorded.times, bench.measure) : [];
  };

  /**
   * Each framework's summed result over the given benches. Frameworks the
   * run has no data for are absent rather than 0, so callers can tell
   * "did nothing" from "did everything instantly".
   */
  totalsFor = (frameworkNames: string[], benches: BenchmarkInfo[], percentile: Percentile) => {
    const totals: Record<string, number> = {};

    for (const framework of frameworkNames) {
      for (const bench of benches) {
        const time = this.timeFor(framework, bench, percentile);

        if (time === undefined) continue;

        totals[framework] = (totals[framework] ?? 0) + time;
      }
    }

    return totals;
  };

  /**
   * Frameworks ordered by their summed result over one area's benches.
   *
   * "best" and "worst" are stated in the area's own direction -- best-first
   * is the highest total when bigger is better and the lowest when smaller
   * is -- so the same setting reads coherently across both areas. Frameworks
   * the set has no data for go last either way.
   */
  sortedByTotal = (
    frameworkNames: string[],
    benches: BenchmarkInfo[],
    percentile: Percentile,
    sort: TotalSort,
  ) => {
    const totals = this.totalsFor(frameworkNames, benches, percentile);
    const descending = (sort === "best") === isBiggerBetter(benches[0] ?? {});

    return frameworkNames.toSorted((a, b) => {
      const totalA = totals[a];
      const totalB = totals[b];

      if (totalA === undefined && totalB === undefined) return 0;
      if (totalA === undefined) return 1;
      if (totalB === undefined) return -1;

      return descending ? totalB - totalA : totalA - totalB;
    });
  };

  /**
   * Every framework's showing at one bench, sorted fastest-first --
   * what the animated view races.
   */
  rankingFor = (benchName: string, percentile: Percentile): Results => {
    const list = [];

    for (const [framework, benches] of Object.entries(this.data.results)) {
      const benchData = benches[benchName];
      const frameworkInfo = frameworks[framework];

      assert(
        `Could not find bench data for bench ${benchName} and framework ${framework}`,
        benchData,
      );
      assert(
        `Could not find framework information for the framework named ${framework}. Available known frameworks: ${Object.keys(
          frameworks,
        ).join(", ")}`,
        frameworkInfo,
      );

      if (!benchData || !frameworkInfo) {
        continue;
      }

      const time = timeFromMarks(
        benchData.times,
        benchData.measure,
        percentile,
        isBiggerBetter(benchData),
      );

      list.push({
        name: framework,
        speed: time,
        color: frameworkInfo.color,
        version: benchData.version,
        units: benchData.measure ?? "ms",
      });
    }

    return list.sort((a, b) => a.speed - b.speed);
  };

  #versionsOf(framework: string) {
    return new Set(
      Object.values(this.data.results[framework] ?? {}).map((result) => result.version),
    );
  }

  /**
   * Every benchmark is its own app, so a framework's version can drift
   * between them -- a maintenance problem worth shouting about.
   *
   * Checked once per loaded run rather than per rendered version, because
   * a framework whose version is displayed as a PR link never has its
   * version read at all: template arguments are lazy, so the frameworks
   * most likely to have drifted are exactly the ones that would slip
   * through a check that hangs off the display.
   */
  #warnOnVersionDivergence() {
    for (const framework of this.frameworks) {
      const versions = this.#versionsOf(framework);

      warn(
        `There is more than one version for ${framework}. You need to do some upgrading to get the benchmark apps for ${framework} in sync. Found ${Array.from(versions).join(", ")}`,
        versions.size <= 1,
        {
          id: "benchmark-app-maintenance-needed-version-divergence",
        },
      );
    }
  }
}

/**
 * Every bench brackets its work with these two marks.
 *
 * Matched exactly. They used to be matched with `endsWith`, which quietly
 * answers to any other mark a framework or a future harness change might
 * emit -- and the first match wins, so a stray `:start`-suffixed mark
 * silently redefines where the measurement began.
 */
const START = ":start";
const DONE = ":done";

/**
 * The duration of each run, from a run's marks.
 */
function durationsOf(runs: Array<Mark[]>) {
  const durations: number[] = [];

  for (const marks of runs) {
    const start = marks.find((mark) => mark.name === START);
    const done = marks.find((mark) => mark.name === DONE);

    if (!start || !done) {
      console.warn(`Dataset could have missing data`);
      console.debug(runs);
      continue;
    }

    durations.push(done.at - start.at);
  }

  return durations;
}

/**
 * Benches that sample rather than complete (dbmon) record each sample as
 * the detail of a named mark, and every sample counts -- one run can carry
 * several of them.
 */
function detailsOf(runs: Array<Mark[]>, name: string) {
  const details: number[] = [];

  for (const marks of runs) {
    for (const mark of marks) {
      if (mark.name === name) {
        details.push(mark.detail);
      }
    }
  }

  return details;
}

/**
 * The single place marks become numbers: the summary table and the
 * boxplots used to extract them separately -- and differently, one by name
 * and one by position -- so the same dataset could put a framework in a
 * different place depending on which of the two you were looking at.
 */
function samplesOf(times: Array<Mark[]>, measure: string | undefined) {
  return measure ? detailsOf(times, measure) : durationsOf(times);
}

/**
 * p50 is the median.
 *
 * Percentiles run toward the *worse* end of the distribution whichever
 * direction is better, so pXX always reads "XX% of samples came in at
 * least this good": for a duration that is the slow tail, for a frame rate
 * it is the low tail.
 *
 * Interpolates between order statistics (the same method as Excel's
 * PERCENTILE.INC and numpy's default), so p50 of an even-sized sample is
 * the midpoint of the middle two -- the median as anyone would compute it
 * by hand.
 */
function percentileOf(values: number[], percentile: Percentile, biggerIsBetter: boolean) {
  if (values.length === 0) return NaN;

  const sorted = values.toSorted((a, b) => a - b);
  const towardWorst = biggerIsBetter ? 100 - percentile : percentile;
  const rank = ((sorted.length - 1) * towardWorst) / 100;
  const below = Math.floor(rank);
  const above = Math.ceil(rank);
  const value = sorted[below] as number;

  if (below === above) return value;

  return value + (rank - below) * ((sorted[above] as number) - value);
}

function timeFromMarks(
  times: Array<Mark[]>,
  measure: string | undefined,
  percentile: Percentile,
  biggerIsBetter: boolean,
) {
  return round(percentileOf(samplesOf(times, measure), percentile, biggerIsBetter));
}
