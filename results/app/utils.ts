import { metadata } from "virtual:result-sets";

import type RouterService from "@ember/routing/router-service";
import type { BenchmarkInfo } from "#types";

/**
 * The query for a `<LinkTo @route="results">` pointing at the named run.
 */
export function resultsQuery(runName: string) {
  return { q: runName };
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
  if (meta.hz !== undefined) parts.push(`${displayHz(meta.hz)} Hz`);

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

/**
 * The recorded refresh rate is 0-indexed -- a 120 Hz monitor records 119.
 * Every rendered rate (and anything derived from one, like the frame
 * budget) goes through here; comparisons between recorded values stay on
 * the recorded convention.
 */
export function displayHz(recorded: number) {
  return recorded + 1;
}

const msInOneHz = 1_000;

export function msOfFrameAt(recordedHz: number) {
  const result = msInOneHz / displayHz(recordedHz);

  return Math.round(result * 100) / 100;
}

export const PERCENTILES = [50, 75, 90] as const;

export type Percentile = (typeof PERCENTILES)[number];

export const DEFAULT_PERCENTILE: Percentile = 50;

export function labelFor(percentile: Percentile) {
  return percentile === 50 ? "p50 (median)" : `p${percentile}`;
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
 * Accepts anything that records a direction: `BenchmarkInfo` states it
 * outright, per-result data only when bigger is better.
 */
export function isBiggerBetter(bench: { whatsBetter?: string }) {
  return bench.whatsBetter === "bigger";
}

/**
 * The benches in display order: the completion-style ones first, the
 * async ones after them.
 */
export function asyncBenchesLast(benches: BenchmarkInfo[]) {
  return benches.toSorted(
    (a, b) => Number(a.name.includes("async")) - Number(b.name.includes("async")),
  );
}

export function higherIsBetterBenches(benchmarkInfo: BenchmarkInfo[]) {
  return benchmarkInfo.filter(isBiggerBetter);
}

export function lowerIsBetterBenches(benchmarkInfo: BenchmarkInfo[]) {
  return asyncBenchesLast(benchmarkInfo.filter((bench) => !isBiggerBetter(bench)));
}
