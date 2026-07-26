import { assert, warn } from "@ember/debug";

import { frameworks } from "./frameworks.ts";

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

/**
 * A label to show in place of the version, when a run was built from
 * something that doesn't have one -- a PR, say.
 */
export function overrideOf(file: ResultSet, framework: string) {
  return file.versionOverrides?.[framework];
}

/**
 * How one framework did at one benchmark, or undefined when that run
 * doesn't have the pair.
 */
export function timeFor(file: ResultSet, framework: string, bench: BenchmarkInfo) {
  const test = file.results[framework]?.[bench.name];

  if (!test) return;

  return timeFromMarks(test.times, bench.measure);
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

const msInOneHz = 1_000;

export function msOfFrameAt(hz: number) {
  const result = msInOneHz / hz;

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

function mean(values: number[]) {
  if (values.length === 0) return NaN;

  let total = 0;

  values.forEach((value) => (total += value));

  return total / values.length;
}

export function timeFromMarks(times: Array<Mark[]>, measure: string | undefined) {
  return round(mean(samplesOf(times, measure)));
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

export function dataOf(results: ResultData, benchName: string) {
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

    const time = timeFromMarks(benchData.times, benchData.measure);

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
