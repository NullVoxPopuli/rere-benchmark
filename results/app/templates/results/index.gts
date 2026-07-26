import Component from "@glimmer/component";
import { cached } from "@glimmer/tracking";
import { get } from "@ember/helper";
import { service } from "@ember/service";

import { interpolate } from "culori";

import { BenchmarkName } from "#components/benchmark-name.gts";
import { FrameworkInfo } from "#components/framework-info.gts";
import { Version } from "#components/version.gts";
import {
  higherIsBetterBenches,
  labelFor,
  lowerIsBetterBenches,
  overrideOf,
  percentileFrom,
  PERCENTILES,
  round,
  timeFor,
  versionOf,
} from "#utils";

import type RouterService from "@ember/routing/router-service";
import type { Model } from "#routes/results.ts";
import type { BenchmarkInfo, ResultSet } from "#types";
import type { Percentile } from "#utils";

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

type ValueMode = "raw" | "linear" | "times";

/**
 * The ?mode= query param, wherever a component needs it.
 * router.currentRoute is tracked, so reads stay live across transitions.
 */
function modeFrom(router: RouterService): ValueMode {
  const mode = router.currentRoute?.queryParams["mode"];

  return mode === "linear" || mode === "times" ? mode : "raw";
}

/**
 * The same normalization the cell colors use, as a displayable value.
 */
function scoreFor(speed: number | undefined, min: number | undefined, max: number | undefined) {
  if (speed === undefined || min === undefined || max === undefined) return;
  if (max === min) return (1).toFixed(2);

  return ((speed - min) / (max - min)).toFixed(2);
}

/**
 * How many times worse than the row's best this value is: 1 for the
 * best, 1.1 for 10% worse, etc. Always >= 1 regardless of direction.
 */
function timesBestFor(
  speed: number | undefined,
  min: number | undefined,
  max: number | undefined,
  bestIsMax: boolean,
) {
  if (speed === undefined || min === undefined || max === undefined) return;
  if (speed <= 0 || min <= 0) return;

  return bestIsMax ? max / speed : speed / min;
}

function formatTimes(ratio: number) {
  return `${Math.round(ratio * 100) / 100}x`;
}

function speedsFor(
  file: ResultSet,
  benchInfo: BenchmarkInfo,
  frameworkNames: string[],
  percentile: Percentile,
) {
  const speeds: Record<string, number | undefined> = {};
  let min = Infinity;
  let max = -Infinity;

  for (const framework of frameworkNames) {
    const time = timeFor(file, framework, benchInfo, percentile);

    if (time === undefined) continue;

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
}> {
  @service declare router: RouterService;

  /**
   * Derived, not constructor-assigned: the percentile is read off the URL,
   * so every one of these has to fall out again when it changes.
   */
  @cached
  get row() {
    const { speeds, min, max } = speedsFor(
      this.args.file,
      this.args.benchInfo,
      this.args.frameworkNames,
      percentileFrom(this.router),
    );

    const colors: Record<string, string | undefined> = {};

    for (const framework of this.args.frameworkNames) {
      colors[framework] = colorFor(
        speeds[framework],
        min,
        max,
        this.args.benchInfo.whatsBetter === "bigger",
      );
    }

    return { speeds, min, max, colors };
  }

  get colors() {
    return this.row.colors;
  }

  value = (framework: string) => {
    const { speeds, min, max } = this.row;
    const speed = speeds[framework];
    const bestIsMax = this.args.benchInfo.whatsBetter === "bigger";

    switch (modeFrom(this.router)) {
      case "linear":
        return scoreFor(speed, min, max);
      case "times": {
        const ratio = timesBestFor(speed, min, max, bestIsMax);

        return ratio === undefined ? undefined : formatTimes(ratio);
      }

      default:
        return speed;
    }
  };

  <template>
    <tr>
      <BenchmarkName @bench={{@benchInfo}} />

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
}> {
  @service declare router: RouterService;

  get shouldShowTotals() {
    return this.args.benches.length > 1;
  }

  get percentile() {
    return percentileFrom(this.router);
  }

  get statLabel() {
    return labelFor(this.percentile);
  }

  /**
   * Derived, not constructor-assigned: the percentile is read off the URL,
   * so the totals have to fall out again when it changes.
   */
  @cached
  get totals() {
    const totals: Record<string, number> = {};

    if (!this.shouldShowTotals) return totals;

    for (const bench of this.args.benches) {
      for (const framework of this.args.file.selections.frameworks) {
        totals[framework] ??= 0;

        const time = timeFor(this.args.file, framework, bench, this.percentile);

        if (time === undefined) continue;

        totals[framework] += time;
      }
    }

    let max = -Infinity;
    let min = Infinity;

    for (const [key, value] of Object.entries(totals)) {
      totals[key] = round(value);

      if (value > max) max = value;
      if (value < min) min = value;
    }

    totals.max = max;
    totals.min = min;

    return totals;
  }

  get frameworkNames() {
    return this.args.file.selections.frameworks;
  }

  totalValue = (framework: string) => {
    const total = this.totals[framework];

    switch (modeFrom(this.router)) {
      case "linear":
        return scoreFor(total, this.totals.min, this.totals.max);
      case "times": {
        // times-best of the raw totals, so the best column reads 1x
        const ratio = timesBestFor(
          total,
          this.totals.min,
          this.totals.max,
          this.args.benches[0]?.whatsBetter === "bigger",
        );

        return ratio === undefined ? undefined : formatTimes(ratio);
      }

      default:
        return total;
    }
  };

  <template>
    {{! wide tables widen the page itself so the sticky header row and
        benchmark-name column can pin against the viewport }}
    <table class="results-table">
      <thead>
        <tr>
          {{! which number every cell below is, stated where a reader
              looking at a cell is already looking }}
          <th class="stat-label" title="every cell is the {{this.statLabel}} of that run's samples">
            {{this.statLabel}}
          </th>
          {{#each this.frameworkNames as |framework|}}
            <th class="fw-header">
              <FrameworkInfo @name={{framework}} />
              <span class="small">
                <Version
                  @version={{versionOf @file framework}}
                  @override={{overrideOf @file framework}}
                />
              </span>
            </th>
          {{/each}}
        </tr>
      </thead>
      <tbody>
        {{#each @benches as |bench|}}
          <TableRow @file={{@file}} @benchInfo={{bench}} @frameworkNames={{this.frameworkNames}} />
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
    return modeFrom(this.router);
  }

  setMode = (mode: ValueMode) => {
    this.router.transitionTo({ queryParams: { mode } });
  };

  isMode = (mode: ValueMode) => this.mode === mode;

  percentiles = PERCENTILES;

  get percentile(): Percentile {
    return percentileFrom(this.router);
  }

  setPercentile = (percentile: Percentile) => {
    this.router.transitionTo({ queryParams: { p: percentile } });
  };

  isPercentile = (percentile: Percentile) => this.percentile === percentile;

  labelFor = labelFor;

  get file() {
    return this.args.model.data;
  }

  get benchmarkInfo() {
    return this.args.model.data.benchmarkInfo;
  }

  @cached
  get higherBenches() {
    return higherIsBetterBenches(this.benchmarkInfo);
  }

  @cached
  get lowerBenches() {
    return lowerIsBetterBenches(this.benchmarkInfo);
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
          checked={{this.isMode "times"}}
          {{on "change" (fn this.setMode "times")}}
        />
        times best
        <span class="units">(1x is best)</span>
      </label>
    </fieldset>

    <fieldset class="value-mode">
      <legend>statistic</legend>
      {{#each this.percentiles as |percentile|}}
        <label>
          <input
            type="radio"
            name="percentile"
            checked={{this.isPercentile percentile}}
            {{on "change" (fn this.setPercentile percentile)}}
          />
          {{this.labelFor percentile}}
        </label>
      {{/each}}
      {{! percentiles run toward the worse end either way, so the same
          number means the same thing on both tables }}
      <span class="units">of each run's samples; higher p = further into the bad tail</span>
    </fieldset>

    {{#if this.higherBenches.length}}
      <h2>higher is better</h2>

      <Table @benches={{this.higherBenches}} @file={{this.file}} />
      <br />
      <br />
      <br />
    {{/if}}

    {{#if this.lowerBenches.length}}
      <h2>lower is better</h2>

      <Table @benches={{this.lowerBenches}} @file={{this.file}} />
      <br />
      <br />
      <br />
    {{/if}}
  </template>
}
