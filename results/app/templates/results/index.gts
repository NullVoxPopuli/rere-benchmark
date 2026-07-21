import Component from "@glimmer/component";
import { cached } from "@glimmer/tracking";
import { warn } from "@ember/debug";
import { get } from "@ember/helper";
import { service } from "@ember/service";

import { interpolate } from "culori";

import { FrameworkInfo } from "#components/framework-info.gts";
import { round, timeFromMarks } from "#utils";

import type Owner from "@ember/owner";
import type RouterService from "@ember/routing/router-service";
import type { Model } from "#routes/results.ts";
import type { BenchmarkInfo, ResultSet } from "#types";

const start = "#ff7777";
const end = "#77ff77";

function colorFor(
  speed: number | undefined,
  min: number | undefined,
  max: number | undefined,
  reverse = false,
) {
  if (!speed || !min || !max) return;

  const interpolation = interpolate(reverse ? [start, end] : [end, start], "oklch");

  const normalized = (speed - min) / (max - min);
  const color = interpolation(normalized);

  return `oklch(${color.l} ${color.c} ${color.h}deg)`;
}

type ValueMode = "raw" | "linear" | "log" | "ranking";

/**
 * The same normalization the cell colors use, as a displayable value.
 */
function scoreFor(speed: number | undefined, min: number | undefined, max: number | undefined) {
  if (speed === undefined || min === undefined || max === undefined) return;
  if (max === min) return (1).toFixed(2);

  return ((speed - min) / (max - min)).toFixed(2);
}

/**
 * One decade of spread: distances from best map like log10(1 + 9u).
 */
const LOG_SCALE = 9;

/**
 * Like scoreFor, but warped so the steep part of the log sits at the
 * "best" end: frameworks close to the best spread apart, differences
 * among the slowest compress. Orientation matches the linear score
 * (and the colors): best is 1 when bigger is better, 0 otherwise.
 */
function logScoreFor(
  speed: number | undefined,
  min: number | undefined,
  max: number | undefined,
  bestIsMax: boolean,
) {
  if (speed === undefined || min === undefined || max === undefined) return;
  if (max === min) return (bestIsMax ? 1 : 0).toFixed(2);

  const linear = (speed - min) / (max - min);
  const distanceFromBest = bestIsMax ? 1 - linear : linear;
  const warped = Math.log1p(LOG_SCALE * distanceFromBest) / Math.log1p(LOG_SCALE);

  return (bestIsMax ? 1 - warped : warped).toFixed(2);
}

const ORDINAL_RULES = new Intl.PluralRules("en", { type: "ordinal" });
const ORDINAL_SUFFIXES: Record<string, string> = { one: "st", two: "nd", few: "rd", other: "th" };

function ordinal(rank: number) {
  return `${rank}${ORDINAL_SUFFIXES[ORDINAL_RULES.select(rank)]}`;
}

/**
 * Competition ranking: 1 + the number of strictly better values, so
 * ties share a rank.
 */
function rankFor(
  values: Record<string, number | undefined>,
  names: string[],
  name: string,
  bestIsMax: boolean,
) {
  const value = values[name];

  if (value === undefined) return;

  let better = 0;

  for (const other of names) {
    const otherValue = values[other];

    if (otherValue === undefined) continue;
    if (bestIsMax ? otherValue > value : otherValue < value) better++;
  }

  return 1 + better;
}

function speedsFor(file: ResultSet, benchInfo: BenchmarkInfo, frameworkNames: string[]) {
  const speeds: Record<string, number | undefined> = {};
  let min = Infinity;
  let max = -Infinity;

  for (const framework of frameworkNames) {
    const test = file.results[framework]?.[benchInfo.name];

    if (!test) continue;

    const time = timeFromMarks(test.times, benchInfo.measure);

    speeds[framework] = time;

    if (time > max) max = time;
    if (time < min) min = time;
  }

  return { speeds, min, max };
}

class TableRow extends Component<{
  file: ResultSet;
  benchInfo: BenchmarkInfo;
  frameworkNames: string[];
  mode: ValueMode;
}> {
  declare speeds: Record<string, number | undefined>;
  declare colors: Record<string, string | undefined>;
  max = -Infinity;
  min = Infinity;

  constructor(
    owner: Owner,
    args: {
      file: ResultSet;
      benchInfo: BenchmarkInfo;
      frameworkNames: string[];
      mode: ValueMode;
    },
  ) {
    super(owner, args);

    const { speeds, min, max } = speedsFor(args.file, args.benchInfo, args.frameworkNames);

    this.speeds = speeds;
    this.min = min;
    this.max = max;
    this.colors = {};

    for (const framework of args.frameworkNames) {
      const time = this.speeds[framework];

      this.colors[framework] = colorFor(
        time,
        this.min,
        this.max,
        args.benchInfo.whatsBetter === "bigger",
      );
    }
  }

  value = (framework: string) => {
    const speed = this.speeds[framework];
    const bestIsMax = this.args.benchInfo.whatsBetter === "bigger";

    switch (this.args.mode) {
      case "linear":
        return scoreFor(speed, this.min, this.max);
      case "log":
        return logScoreFor(speed, this.min, this.max, bestIsMax);
      case "ranking": {
        const rank = rankFor(this.speeds, this.args.frameworkNames, framework, bestIsMax);

        return rank === undefined ? undefined : ordinal(rank);
      }

      default:
        return speed;
    }
  };

  <template>
    <tr>
      <td class="benchmark-name">
        {{@benchInfo.name}}
        <span class="units">
          (
          {{@benchInfo.units}}
          )
        </span>
      </td>

      {{#each @frameworkNames as |framework|}}
        <td style="background: {{get this.colors framework}};"><span class="value">{{this.value
              framework
            }}</span></td>
      {{/each}}
    </tr>
  </template>
}

class Table extends Component<{
  benches: BenchmarkInfo[];
  file: ResultSet;
  mode: ValueMode;
}> {
  shouldShowTotals = false;
  totals: Record<string, number> = {};

  constructor(
    owner: Owner,
    args: {
      benches: BenchmarkInfo[];
      file: ResultSet;
      mode: ValueMode;
    },
  ) {
    super(owner, args);

    this.shouldShowTotals = this.args.benches.length > 1;

    if (this.shouldShowTotals) {
      for (const bench of args.benches) {
        for (const framework of args.file.selections.frameworks) {
          this.totals[framework] ??= 0;

          const test = args.file.results[framework]?.[bench.name];

          if (!test) continue;

          const time = timeFromMarks(test.times, bench.measure);

          this.totals[framework] += time;
        }
      }

      let max = -Infinity;
      let min = Infinity;

      for (const [key, value] of Object.entries(this.totals)) {
        this.totals[key] = round(value);

        if (value > max) max = value;
        if (value < min) min = value;
      }

      this.totals.max = max;
      this.totals.min = min;
    }
  }

  get frameworkNames() {
    return this.args.file.selections.frameworks;
  }

  /**
   * Each framework's ranks across this table's benches, summed.
   */
  @cached
  get rankTotals(): Record<string, number | undefined> {
    const sums: Record<string, number | undefined> = {};

    for (const bench of this.args.benches) {
      const { speeds } = speedsFor(this.args.file, bench, this.frameworkNames);

      for (const framework of this.frameworkNames) {
        const rank = rankFor(
          speeds,
          this.frameworkNames,
          framework,
          bench.whatsBetter === "bigger",
        );

        if (rank === undefined) continue;

        sums[framework] = (sums[framework] ?? 0) + rank;
      }
    }

    return sums;
  }

  totalValue = (framework: string) => {
    const total = this.totals[framework];

    switch (this.args.mode) {
      case "linear":
        return scoreFor(total, this.totals.min, this.totals.max);
      case "log":
        return logScoreFor(
          total,
          this.totals.min,
          this.totals.max,
          this.args.benches[0]?.whatsBetter === "bigger",
        );
      case "ranking": {
        // lowest rank sum is the overall winner
        const rank = rankFor(this.rankTotals, this.frameworkNames, framework, false);

        return rank === undefined ? undefined : ordinal(rank);
      }

      default:
        return total;
    }
  };

  versionFor = (framework: string) => {
    /**
     * Because each bench mark is a different app, it is possible the versions diverge
     */
    const versions = Object.values(this.args.file.results[framework] ?? {}).map(
      (result) => result.version,
    );

    const versionSet = new Set(versions);

    warn(
      `There is more than one version for ${framework}. You need to do some upgrading to get the benchmark apps for ${framework} in sync. Found ${[...versionSet].join(", ")}`,
      versionSet.size > 1,
      {
        id: "benchmark-app-maintenance-needed-version-divergence",
      },
    );

    return [...versionSet][0];
  };

  <template>
    <table>
      <thead>
        <tr>
          <th></th>
          {{#each this.frameworkNames as |framework|}}
            <th class="fw-header">
              <FrameworkInfo @name={{framework}} />
              <span class="small">
                {{this.versionFor framework}}
              </span>
            </th>
          {{/each}}
        </tr>
      </thead>
      <tbody>
        {{#each @benches as |bench|}}
          <TableRow
            @file={{@file}}
            @benchInfo={{bench}}
            @frameworkNames={{this.frameworkNames}}
            @mode={{@mode}}
          />
        {{/each}}
      </tbody>

      {{#if this.shouldShowTotals}}
        <tfoot>
          <tr><th style="text-align: right">Total</th>
            {{#each this.frameworkNames as |framework|}}
              <td
                style="background: {{colorFor
                  (get this.totals framework)
                  this.totals.min
                  this.totals.max
                }}"
              >
                <span class="value">{{this.totalValue framework}}</span>
              </td>
            {{/each}}
          </tr>
        </tfoot>
      {{/if}}
    </table>
  </template>
}

export default class ResultsTables extends Component<{
  model: Model;
}> {
  @service declare router: RouterService;

  get mode(): ValueMode {
    const mode = this.router.currentRoute?.queryParams["mode"];

    return mode === "linear" || mode === "log" || mode === "ranking" ? mode : "raw";
  }

  setMode = (mode: ValueMode) => {
    this.router.transitionTo({ queryParams: { mode } });
  };

  isMode = (mode: ValueMode) => this.mode === mode;

  get file() {
    return this.args.model.data;
  }

  get benchmarkInfo() {
    return this.args.model.data.benchmarkInfo;
  }

  @cached
  get higherBenches() {
    return this.benchmarkInfo.filter((bench) => bench.whatsBetter === "bigger");
  }

  @cached
  get lowerBenches() {
    return this.benchmarkInfo
      .filter((bench) => bench.whatsBetter !== "bigger")
      .toSorted()
      .toSorted((a, b) => (a.name.includes("async") ? 1 : 0) - (b.name.includes("async") ? 1 : 0));
  }

  <template>
    <fieldset class="value-mode">
      <legend>values</legend>
      <label>
        <input
          type="radio"
          name="value-mode"
          checked={{this.isMode "raw"}}
          {{on "change" (fn this.setMode "raw")}}
        />
        raw
      </label>
      <label>
        <input
          type="radio"
          name="value-mode"
          checked={{this.isMode "linear"}}
          {{on "change" (fn this.setMode "linear")}}
        />
        score
        <span class="units">(normalized 0 to 1)</span>
      </label>
      <label>
        <input
          type="radio"
          name="value-mode"
          checked={{this.isMode "log"}}
          {{on "change" (fn this.setMode "log")}}
        />
        log score
        <span class="units">(more variance near best)</span>
      </label>
      <label>
        <input
          type="radio"
          name="value-mode"
          checked={{this.isMode "ranking"}}
          {{on "change" (fn this.setMode "ranking")}}
        />
        ranking
        <span class="units">(1st is best)</span>
      </label>
    </fieldset>

    {{#if this.higherBenches.length}}
      <h2>higher is better</h2>

      <Table @benches={{this.higherBenches}} @file={{this.file}} @mode={{this.mode}} />
      <br />
      <br />
      <br />
    {{/if}}

    {{#if this.lowerBenches.length}}
      <h2>lower is better</h2>

      <Table @benches={{this.lowerBenches}} @file={{this.file}} @mode={{this.mode}} />
      <br />
      <br />
      <br />
    {{/if}}
  </template>
}
