import { assert } from "@ember/debug";

import { frameworks } from "./frameworks.ts";

import type { Mark, ResultData } from "#types";

export function getFrameworkVersion(results: ResultData, framework: string) {
  return Object.values(results[framework] ?? {})[0]?.version;
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

function averageOf(arrayOfMarks: Array<Mark[]>) {
  const durations = [];

  for (const pair of arrayOfMarks) {
    const start = pair.find((x) => x.name.endsWith("start"));
    const done = pair.find((x) => x.name.endsWith("done"));

    if (!done || !start) {
      console.warn(`Dataset could have missing data`);
      console.debug(arrayOfMarks);
      continue;
    }

    const duration = done.at - start.at;

    durations.push(duration);
  }

  let total = 0;

  durations.forEach((d) => (total += d));

  return round(total / durations.length);
}

function averageOfNamedMark(sampleBuckets: Array<Mark[]>, name: string) {
  const fps = [];

  for (const list of sampleBuckets) {
    for (const mark of list) {
      if (mark.name === name) {
        fps.push(mark.detail);
      }
    }
  }

  let total = 0;

  fps.forEach((f) => (total += f));

  return round(total / fps.length);
}

export function timeFromMarks(times: Array<Mark[]>, measure: string | undefined) {
  if (measure) {
    return averageOfNamedMark(times, measure);
  }

  return averageOf(times);
}

export function isBiggerBetter(results: { whatsBetter: string }): boolean {
  return results.whatsBetter === "bigger";
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
