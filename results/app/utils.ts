import { assert, warn } from "@ember/debug";

import { experiments, metadata } from "virtual:result-sets";

import { frameworks } from "./frameworks.ts";

import type RouterService from "@ember/routing/router-service";
import type { BenchmarkInfo, Mark, ResultData, ResultSet } from "#types";

function versionsOf(file: ResultSet, framework: string) {
  return new Set(Object.values(file.results[framework] ?? {}).map((result) => result.version));
}

/**
 * The version of a framework in a run.
 */
export function versionOf(file: ResultSet, framework: string) {
  return [...versionsOf(file, framework)][0];
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
export function warnOnVersionDivergence(file: ResultSet) {
  for (const framework of getFrameworks(file.results)) {
    const versions = versionsOf(file, framework);

    warn(
      `There is more than one version for ${framework}. You need to do some upgrading to get the benchmark apps for ${framework} in sync. Found ${[...versions].join(", ")}`,
      versions.size <= 1,
      {
        id: "benchmark-app-maintenance-needed-version-divergence",
      },
    );
  }
}

export async function fetchResultSet(name: string): Promise<ResultSet> {
  // experiments live in a separate directory from the official runs
  const dir = experiments.includes(name) ? "experiments" : "results";
  const response = await fetch(`/${dir}/${name}.json`);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const json = await response.json();

  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  warnOnVersionDivergence(json);

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return json;
}

/**
 * A label to show in place of the version, when a run was built from
 * something that doesn't have one -- a PR, say.
 */
export function overrideOf(file: ResultSet, framework: string) {
  return file.versionOverrides?.[framework];
}

/**
 * The variant a run recorded for a framework, if any -- e.g. "Vapor" for a
 * Vue Vapor build. Shown under the framework's name, above its version.
 */
export function variantOf(file: ResultSet, framework: string) {
  return file.notes?.[framework]?.variant;
}

export interface DisplayPr {
  url: string;
  title?: string;
  /**
   * `#<number>` when the URL has one, the URL itself otherwise.
   */
  label: string;
}

/**
 * The PRs a run recorded (the ones that landed between the previous
 * result set and the run), normalized for display: the runner records
 * `{ url, title }`, hand-added entries are plain URL strings.
 */
export function prsOf(file: ResultSet): DisplayPr[] {
  const prs = file.notes?.prs ?? [];

  return prs.map((pr) => {
    const url = typeof pr === "string" ? pr : pr.url;
    const title = typeof pr === "string" ? undefined : pr.title;
    const number = url.match(/\/pull\/(\d+)/)?.[1];

    return { url, title, label: number ? `#${number}` : url };
  });
}

/**
 * How one framework did at one benchmark, or undefined when that run
 * doesn't have the pair.
 */
export function timeFor(
  file: ResultSet,
  framework: string,
  bench: BenchmarkInfo,
  percentile: Percentile,
) {
  const test = file.results[framework]?.[bench.name];

  if (!test) return;

  return timeFromMarks(test.times, bench.measure, percentile, bench.whatsBetter === "bigger");
}

/**
 * How much the CPU was slowed down for a run. Timings are only comparable
 * at the same setting, so this is worth stating outright. A run from
 * before the setting was recorded is not the same as an unthrottled one.
 */
export function throttleLabel(cpuThrottle: number | undefined) {
  if (cpuThrottle === undefined) return "CPU throttle unrecorded";

  return cpuThrottle > 1 ? `${cpuThrottle}x CPU slowdown` : "no CPU slowdown";
}

export function getFrameworks(results: ResultData): string[] {
  return Object.keys(results);
}

export function getBenchNames(results: ResultData): Set<string> {
  const names = new Set<string>();

  Object.values(results)
    .map(Object.keys)
    .flat()
    .forEach((name) => {
      names.add(name);
    });

  return names;
}

/**
 * Round to the hundredth's place
 */
export function round(ms: number) {
  return Math.round(ms * 100) / 100;
}

/**
 * Format a millisecond duration as a human-readable string,
 * e.g. 45200 -> "45.2s", 754000 -> "12m 34s".
 */
export function formatDuration(ms: number): string {
  const totalSeconds = ms / 1000;

  if (totalSeconds < 60) {
    return `${round(totalSeconds)}s`;
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);

  return `${minutes}m ${seconds}s`;
}

const TIMESTAMP_FORMAT = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

export function formatTimestamp(datetime: string) {
  return TIMESTAMP_FORMAT.format(new Date(datetime));
}

/**
 * Result-set names are just numbers (`6`), experiments a prefix and a number
 * (`ember-1`) -- nothing worth displaying. What a run name *displays* as
 * comes from the build-time `metadata` instead, so no set has to be fetched
 * before it's shown. The raw name stays in URLs and `title` attributes.
 */
const RUN_DATE_FORMAT = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });

/**
 * Browsers state their product name long-form ("Google Chrome"); the short
 * name reads better in a run's name.
 */
const BROWSER_SHORT_NAMES: Record<string, string> = {
  "Google Chrome": "Chrome",
};

function browserLabel(browser: { name: string; version: string }) {
  const name = BROWSER_SHORT_NAMES[browser.name] ?? browser.name;
  const major = Number.parseInt(browser.version, 10);

  return `${name} ${Number.isNaN(major) ? browser.version : major}`;
}

/**
 * When the named run started (ISO 8601), for `<time datetime>`.
 * `undefined` for names the build found no date for.
 */
export function isoOf(runName: string) {
  return metadata[runName]?.date;
}

/**
 * `#6 Chrome 138 - 60 Hz - 4x throttle - Jul 29, 2026` -- the file number
 * first, then the run's environment headline, the CPU throttle it
 * applied, and its date, formatted for the viewer's locale. Fields a set
 * didn't record drop out; a name with no metadata at all displays as
 * itself.
 */
export function formatRunName(runName: string) {
  const meta = metadata[runName];

  if (!meta) return runName;

  const parts: string[] = [];

  if (meta.browser) parts.push(browserLabel(meta.browser));
  if (meta.hz !== undefined) parts.push(`${meta.hz} Hz`);

  if (meta.throttle !== undefined) {
    parts.push(meta.throttle > 1 ? `${meta.throttle}x throttle` : "no throttle");
  }

  if (meta.date) parts.push(RUN_DATE_FORMAT.format(new Date(meta.date)));

  if (parts.length === 0) return runName;

  return `#${runName} ${parts.join(" - ")}`;
}

/**
 * Just the run's file number (`#6`) for places the full name is too wide,
 * like a column header per run. A name with no metadata (an experiment)
 * is already its own shortest form.
 */
export function shortRunName(runName: string) {
  return metadata[runName] ? `#${runName}` : runName;
}

/**
 * The tooltip behind a displayed run name: the machine's CPU model --
 * too long for the name itself, still worth keeping within reach. The
 * name already leads with the file number, so nothing else belongs here.
 */
export function titleOf(runName: string) {
  return metadata[runName]?.cpu;
}

const RELATIVE_FORMAT = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

// most-significant-first; weeks are omitted because `until` only populates
// them when they're the largest unit requested
const DURATION_UNITS = ["year", "month", "day", "hour", "minute", "second"] as const;

/**
 * "3 days ago" for a run's recorded date; empty for names the build found
 * no date for, so templates can render it unconditionally.
 *
 * Temporal does the calendar-aware breakdown and `Intl.RelativeTimeFormat`
 * the wording; all that's left to us is picking the duration's most
 * significant non-zero unit. Temporal is ES2026 but not yet in Safari, so
 * the hint is simply absent there.
 */
export function relativeToNow(runName: string) {
  const iso = isoOf(runName);

  if (!iso) return "";
  if (!("Temporal" in globalThis)) return "";

  const timeZone = Temporal.Now.timeZoneId();
  const then = Temporal.Instant.from(iso).toZonedDateTimeISO(timeZone);
  const duration = then.until(Temporal.Now.zonedDateTimeISO(), { largestUnit: "year" });

  for (const unit of DURATION_UNITS) {
    const elapsed = duration[`${unit}s`];

    if (elapsed !== 0) {
      return RELATIVE_FORMAT.format(-elapsed, unit);
    }
  }

  return RELATIVE_FORMAT.format(0, "second");
}

const msInOneHz = 1_000;

export function msOfFrameAt(recordedHz: number) {
  const result = msInOneHz / recordedHz;

  return Math.round(result * 100) / 100;
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
 * Every measured value for one framework at one bench, in run order.
 *
 * The single place marks become numbers: the summary table and the
 * boxplots used to extract them separately -- and differently, one by name
 * and one by position -- so the same dataset could put a framework in a
 * different place depending on which of the two you were looking at.
 */
export function samplesOf(times: Array<Mark[]>, measure: string | undefined) {
  return measure ? detailsOf(times, measure) : durationsOf(times);
}

export const PERCENTILES = [50, 75, 90] as const;

export type Percentile = (typeof PERCENTILES)[number];

export const DEFAULT_PERCENTILE: Percentile = 50;

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
export function percentileOf(values: number[], percentile: Percentile, biggerIsBetter: boolean) {
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

export function timeFromMarks(
  times: Array<Mark[]>,
  measure: string | undefined,
  percentile: Percentile,
  biggerIsBetter: boolean,
) {
  return round(percentileOf(samplesOf(times, measure), percentile, biggerIsBetter));
}

/**
 * The `?p=` query param, wherever a component needs it.
 * router.currentRoute is tracked, so reads stay live across transitions.
 */
export function percentileFrom(router: RouterService): Percentile {
  const found = PERCENTILES.find((p) => String(p) === router.currentRoute?.queryParams["p"]);

  return found ?? DEFAULT_PERCENTILE;
}

export type TotalSort = "best" | "worst";

/**
 * The `?sort=` query param, wherever a component needs it.
 * Absent (or anything unrecognized) means the recorded order.
 */
export function totalSortFrom(router: RouterService): TotalSort | undefined {
  const sort = router.currentRoute?.queryParams["sort"];

  return sort === "best" || sort === "worst" ? sort : undefined;
}

/**
 * Frameworks ordered by their summed result over one area's benches.
 *
 * "best" and "worst" are stated in the area's own direction -- best-first
 * is the highest total when bigger is better and the lowest when smaller
 * is -- so the same setting reads coherently across both areas. Frameworks
 * the set has no data for go last either way.
 */
export function sortedByTotal(
  frameworkNames: string[],
  file: ResultSet,
  benches: BenchmarkInfo[],
  percentile: Percentile,
  sort: TotalSort,
) {
  const totals: Record<string, number> = {};

  for (const framework of frameworkNames) {
    for (const bench of benches) {
      const time = timeFor(file, framework, bench, percentile);

      if (time === undefined) continue;

      totals[framework] = (totals[framework] ?? 0) + time;
    }
  }

  const descending = (sort === "best") === (benches[0]?.whatsBetter === "bigger");

  return frameworkNames.toSorted((a, b) => {
    const totalA = totals[a];
    const totalB = totals[b];

    if (totalA === undefined && totalB === undefined) return 0;
    if (totalA === undefined) return 1;
    if (totalB === undefined) return -1;

    return descending ? totalB - totalA : totalA - totalB;
  });
}

export function labelFor(percentile: Percentile) {
  return percentile === 50 ? "p50 (median)" : `p${percentile}`;
}

export function isBiggerBetter(results: { whatsBetter: string }): boolean {
  return results.whatsBetter === "bigger";
}

export function higherIsBetterBenches(benchmarkInfo: BenchmarkInfo[]) {
  return benchmarkInfo.filter((bench) => bench.whatsBetter === "bigger");
}

export function lowerIsBetterBenches(benchmarkInfo: BenchmarkInfo[]) {
  return benchmarkInfo
    .filter((bench) => bench.whatsBetter !== "bigger")
    .toSorted()
    .toSorted((a, b) => (a.name.includes("async") ? 1 : 0) - (b.name.includes("async") ? 1 : 0));
}

export function dataOf(results: ResultData, benchName: string, percentile: Percentile) {
  const list = [];

  for (const [framework, benches] of Object.entries(results)) {
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
      benchData.whatsBetter === "bigger",
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
}
