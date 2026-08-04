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
  isBiggerBetter,
  labelFor,
  percentileFrom,
  PERCENTILES,
  round,
  totalSortFrom,
} from "#utils";

import type RouterService from "@ember/routing/router-service";
import type { Borrow } from "#components/borrow-picker.gts";
import type { ResultSet } from "#result-set";
import type { Model } from "#routes/results.ts";
import type { BenchmarkInfo } from "#types";
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

/**
 * One value the way the ?mode= setting asks for it: as recorded, as the
 * 0-1 score the cell colors use, or as a multiple of the row's best.
 */
function displayValue(
  mode: ValueMode,
  speed: number | undefined,
  min: number | undefined,
  max: number | undefined,
  bestIsMax: boolean,
) {
  switch (mode) {
    case "linear":
      return scoreFor(speed, min, max);
    case "times": {
      const ratio = timesBestFor(speed, min, max, bestIsMax);

      return ratio === undefined ? undefined : formatTimes(ratio);
    }

    default:
      return speed;
  }
}

function speedsFor(
  set: ResultSet,
  benchInfo: BenchmarkInfo,
  frameworkNames: string[],
  percentile: Percentile,
) {
  const speeds: Record<string, number | undefined> = {};
  let min = Infinity;
  let max = -Infinity;

  for (const framework of frameworkNames) {
    const time = set.timeFor(framework, benchInfo, percentile);

    if (time === undefined) continue;

    speeds[framework] = time;

    if (time > max) max = time;
    if (time < min) min = time;
  }

  return { speeds, min, max };
}

class TableRow extends Component<{
  set: ResultSet;
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
    const percentile = percentileFrom(this.router);
    const { speeds, min, max } = speedsFor(
      this.args.set,
      this.args.benchInfo,
      this.args.frameworkNames,
      percentile,
    );

    const { borrow } = this.args;
    const borrowedSpeed = borrow
      ? borrow.set.timeFor(borrow.framework, this.args.benchInfo, percentile)
      : undefined;

    let lo = min;
    let hi = max;

    if (borrowedSpeed !== undefined) {
      if (borrowedSpeed < lo) lo = borrowedSpeed;
      if (borrowedSpeed > hi) hi = borrowedSpeed;
    }

    const reverse = isBiggerBetter(this.args.benchInfo);
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

    return displayValue(
      modeFrom(this.router),
      speed,
      min,
      max,
      isBiggerBetter(this.args.benchInfo),
    );
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
  set: ResultSet;
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
    const { set, benches, frameworkNames, borrow } = this.args;

    if (!this.shouldShowTotals) return { values: {}, borrowed: undefined, min: 0, max: 0 };

    const values = set.totalsFor(frameworkNames, benches, this.percentile);

    for (const framework of frameworkNames) {
      values[framework] ??= 0;
    }

    const borrowed = borrow
      ? (borrow.set.totalsFor([borrow.framework], benches, this.percentile)[borrow.framework] ?? 0)
      : undefined;

    let max = -Infinity;
    let min = Infinity;

    const all = Object.values(values).concat(borrowed === undefined ? [] : [borrowed]);

    for (const value of all) {
      if (value > max) max = value;
      if (value < min) min = value;
    }

    for (const [framework, value] of Object.entries(values)) {
      values[framework] = round(value);
    }

    return { values, borrowed: borrowed === undefined ? undefined : round(borrowed), min, max };
  }

  get frameworkNames() {
    return this.args.frameworkNames;
  }

  get borrowedThrottle() {
    const { borrow, set } = this.args;

    if (!borrow) return;
    if (borrow.set.hasSameThrottleAs(set)) return;

    return borrow.set.throttleLabel;
  }

  displayTotal = (total: number | undefined) =>
    displayValue(
      modeFrom(this.router),
      total,
      this.totals.min,
      this.totals.max,
      isBiggerBetter(this.args.benches[0] ?? {}),
    );

  totalValue = (framework: string) => this.displayTotal(this.totals.values[framework]);

  get borrowedTotalValue() {
    return this.displayTotal(this.totals.borrowed);
  }

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
              <Variant @variant={{@set.variantOf framework}} />
              <span class="small">
                <Version
                  @version={{@set.versionOf framework}}
                  @override={{@set.overrideOf framework}}
                />
              </span>
            </th>
          {{/each}}

          {{#if @borrow}}
            <th class="fw-header borrowed">
              <span class="borrow-tag">borrowed</span>
              <FrameworkInfo @name={{@borrow.framework}} />
              <Variant @variant={{@borrow.set.variantOf @borrow.framework}} />
              <span class="small">
                <Version
                  @version={{@borrow.set.versionOf @borrow.framework}}
                  @override={{@borrow.set.overrideOf @borrow.framework}}
                />
              </span>
              <span class="borrow-source small" title={{@borrow.set.tooltip}}>
                from
                <time datetime={{@borrow.set.iso}}>{{@borrow.set.displayName}}</time>
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
            @set={{@set}}
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
                  (get this.totals.values framework)
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
                <span class="value">{{this.borrowedTotalValue}}</span>
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

  get resultSet() {
    return this.args.model.data;
  }

  get borrow() {
    return borrowOf(this.router, this.args.model.borrowed);
  }

  get visibleFrameworks() {
    return visibleFrameworksOf(this.router, this.resultSet);
  }

  settingParams = ["mode", "p", "hide", "from", "sort"];

  @cached
  get higherBenches() {
    return this.resultSet.higherBenches;
  }

  @cached
  get lowerBenches() {
    return this.resultSet.lowerBenches;
  }

  sorted(benches: BenchmarkInfo[]) {
    const sort = totalSortFrom(this.router);

    if (!sort) return this.visibleFrameworks;

    return this.resultSet.sortedByTotal(this.visibleFrameworks, benches, this.percentile, sort);
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

      <FrameworkToggles @set={{this.resultSet}} />

      <BorrowPicker @borrowed={{@model.borrowed}} />
    </Settings>

    {{#if this.higherBenches.length}}
      <h2>higher is better</h2>

      <Table
        @benches={{this.higherBenches}}
        @set={{this.resultSet}}
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
        @set={{this.resultSet}}
        @frameworkNames={{this.lowerFrameworks}}
        @borrow={{this.borrow}}
      />
      <br />
      <br />
      <br />
    {{/if}}
  </template>
}
