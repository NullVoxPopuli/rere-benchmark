import Component from "@glimmer/component";
import { cached } from "@glimmer/tracking";
import { get } from "@ember/helper";
import { service } from "@ember/service";

import { interpolate } from "culori";

import { BenchmarkName } from "#components/benchmark-name.gts";
import { borrowOf, BorrowPicker } from "#components/borrow-picker.gts";
import { FrameworkInfo } from "#components/framework-info.gts";
import { FrameworkToggles, visibleFrameworksOf } from "#components/framework-toggles.gts";
import { Settings } from "#components/settings.gts";
import { SortControl } from "#components/sort-control.gts";
import { Variant } from "#components/variant.gts";
import { Version } from "#components/version.gts";
import {
  formatRunName,
  higherIsBetterBenches,
  isoOf,
  labelFor,
  lowerIsBetterBenches,
  overrideOf,
  percentileFrom,
  PERCENTILES,
  round,
  sortedByTotal,
  throttleLabel,
  timeFor,
  titleOf,
  totalSortFrom,
  variantOf,
  versionOf,
} from "#utils";

import type RouterService from "@ember/routing/router-service";
import type { Borrow } from "#components/borrow-picker.gts";
import type { Model } from "#routes/results.ts";
import type { BenchmarkInfo, ResultSet } from "#types";
import type { Percentile } from "#utils";

const worst = "#ff7777";
const best = "#77ff77";

/** green at 0, red at 1, so the ramp is always indexed by distance from the best value */
const gradient = interpolate([best, worst], "oklch");

/** how hard the ramp bends toward the best value; 0 is linear */
const CURVE = 13;

/**
 * Where a value sits on the gradient, given how far it is from the row's
 * best result as a fraction of the row's spread.
 *
 * Spending that distance linearly hands the whole scale to the slowest
 * framework: when the worst result is 20x the best, everything within 2x
 * of the winner lands on the same green. A log ramp gives the close race
 * at the top most of the colors and lets the tail share the red.
 */
function rampFromBest(distance: number) {
  return Math.log1p(CURVE * distance) / Math.log1p(CURVE);
}

function colorFor(
  speed: number | undefined,
  min: number | undefined,
  max: number | undefined,
  reverse = false,
) {
  if (!speed || !min || !max) return;

  const normalized = (speed - min) / (max - min);
  const color = gradient(rampFromBest(reverse ? 1 - normalized : normalized));

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
  borrow: Borrow | undefined;
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

    const { borrow } = this.args;
    const borrowedSpeed = borrow
      ? timeFor(borrow.data, borrow.framework, this.args.benchInfo, percentileFrom(this.router))
      : undefined;

    let lo = min;
    let hi = max;

    if (borrowedSpeed !== undefined) {
      if (borrowedSpeed < lo) lo = borrowedSpeed;
      if (borrowedSpeed > hi) hi = borrowedSpeed;
    }

    const reverse = this.args.benchInfo.whatsBetter === "bigger";
    const colors: Record<string, string | undefined> = {};

    for (const framework of this.args.frameworkNames) {
      colors[framework] = colorFor(speeds[framework], lo, hi, reverse);
    }

    const borrowedColor = colorFor(borrowedSpeed, lo, hi, reverse);

    return { speeds, min: lo, max: hi, colors, borrowedSpeed, borrowedColor };
  }

  get colors() {
    return this.row.colors;
  }

  displayOf = (speed: number | undefined) => {
    const { min, max } = this.row;
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

  value = (framework: string) => this.displayOf(this.row.speeds[framework]);

  get borrowedValue() {
    return this.displayOf(this.row.borrowedSpeed);
  }

  <template>
    <tr>
      <BenchmarkName @bench={{@benchInfo}} />

      {{#each @frameworkNames as |framework|}}
        <td style="background: {{get this.colors framework}};"><span class="value">{{this.value
              framework
            }}</span></td>
      {{/each}}

      {{#if @borrow}}
        <td class="borrowed" style="background: {{this.row.borrowedColor}};"><span
            class="value"
          >{{this.borrowedValue}}</span></td>
      {{/if}}
    </tr>
  </template>
}

class Table extends Component<{
  benches: BenchmarkInfo[];
  file: ResultSet;
  frameworkNames: string[];
  borrow: Borrow | undefined;
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
      for (const framework of this.args.frameworkNames) {
        totals[framework] ??= 0;

        const time = timeFor(this.args.file, framework, bench, this.percentile);

        if (time === undefined) continue;

        totals[framework] += time;
      }
    }

    const { borrow } = this.args;

    if (borrow) {
      totals.borrowed = 0;

      for (const bench of this.args.benches) {
        const time = timeFor(borrow.data, borrow.framework, bench, this.percentile);

        if (time === undefined) continue;

        totals.borrowed += time;
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
    return this.args.frameworkNames;
  }

  get borrowedThrottle() {
    const { borrow, file } = this.args;

    if (!borrow) return;

    const theirs = borrow.data.args?.CPU_THROTTLE;

    if ((theirs ?? null) === (file.args?.CPU_THROTTLE ?? null)) return;

    return throttleLabel(theirs);
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
              <Variant @variant={{variantOf @file framework}} />
              <span class="small">
                <Version
                  @version={{versionOf @file framework}}
                  @override={{overrideOf @file framework}}
                />
              </span>
            </th>
          {{/each}}

          {{#if @borrow}}
            <th class="fw-header borrowed">
              <span class="borrow-tag">borrowed</span>
              <FrameworkInfo @name={{@borrow.framework}} />
              <Variant @variant={{variantOf @borrow.data @borrow.framework}} />
              <span class="small">
                <Version
                  @version={{versionOf @borrow.data @borrow.framework}}
                  @override={{overrideOf @borrow.data @borrow.framework}}
                />
              </span>
              <span class="borrow-source small" title={{titleOf @borrow.name}}>
                from
                <time datetime={{isoOf @borrow.name}}>{{formatRunName @borrow.name}}</time>
              </span>
              {{#if this.borrowedThrottle}}
                <span class="small throttle-mismatch">{{this.borrowedThrottle}}</span>
              {{/if}}
            </th>
          {{/if}}
        </tr>
      </thead>
      <tbody>
        {{#each @benches as |bench|}}
          <TableRow
            @file={{@file}}
            @benchInfo={{bench}}
            @frameworkNames={{this.frameworkNames}}
            @borrow={{@borrow}}
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

            {{#if @borrow}}
              <td
                class="borrowed"
                style="background: {{colorFor
                  this.totals.borrowed
                  this.totals.min
                  this.totals.max
                }}"
              >
                <span class="value">{{this.totalValue "borrowed"}}</span>
              </td>
            {{/if}}
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

  get borrow() {
    return borrowOf(this.router, this.args.model.borrowed);
  }

  get visibleFrameworks() {
    return visibleFrameworksOf(this.router, this.file);
  }

  settingParams = ["mode", "p", "hide", "from", "sort"];

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

  sorted(benches: BenchmarkInfo[]) {
    const sort = totalSortFrom(this.router);

    if (!sort) return this.visibleFrameworks;

    return sortedByTotal(this.visibleFrameworks, this.file, benches, this.percentile, sort);
  }

  @cached
  get higherFrameworks() {
    return this.sorted(this.higherBenches);
  }

  @cached
  get lowerFrameworks() {
    return this.sorted(this.lowerBenches);
  }

  <template>
    <Settings @params={{this.settingParams}}>
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
        <span class="units">of each run's samples</span>
      </fieldset>

      <SortControl />

      <FrameworkToggles @file={{this.file}} />

      <BorrowPicker @borrowed={{@model.borrowed}} />
    </Settings>

    {{#if this.higherBenches.length}}
      <h2>higher is better</h2>

      <Table
        @benches={{this.higherBenches}}
        @file={{this.file}}
        @frameworkNames={{this.higherFrameworks}}
        @borrow={{this.borrow}}
      />
      <br />
      <br />
      <br />
    {{/if}}

    {{#if this.lowerBenches.length}}
      <h2>lower is better</h2>

      <Table
        @benches={{this.lowerBenches}}
        @file={{this.file}}
        @frameworkNames={{this.lowerFrameworks}}
        @borrow={{this.borrow}}
      />
      <br />
      <br />
      <br />
    {{/if}}
  </template>
}
