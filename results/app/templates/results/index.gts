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
  columnsFor,
  curveFrom,
  DEFAULT_CURVE,
  formatRunName,
  higherIsBetterBenches,
  labelFor,
  lowerIsBetterBenches,
  overrideOf,
  percentileFrom,
  PERCENTILES,
  round,
  sortedByTotal,
  throttleLabel,
  timeFor,
  totalSortFrom,
  variantOf,
  versionOf,
} from "#utils";

import type RouterService from "@ember/routing/router-service";
import type { Model } from "#routes/results.ts";
import type { BenchmarkInfo, Column, ResultSet } from "#types";
import type { Percentile } from "#utils";

const worst = "#ff7777";
const best = "#77ff77";

/** green at 0, red at 1, so the ramp is always indexed by distance from the best value */
const gradient = interpolate([best, worst], "oklch");

/**
 * Where a value sits on the gradient, given how far it is from the row's
 * best result as a fraction of the row's spread.
 *
 * Spending that distance linearly hands the whole scale to the slowest
 * framework: when the worst result is 20x the best, everything within 2x
 * of the winner lands on the same green. Bending it logarithmically gives
 * the close race at the top more of the colors and lets the tail share the
 * red.
 *
 * `curve` is how hard it bends: 0 is the straight linear ramp, positive
 * spends more of the gradient on the results nearest the best one, and
 * negative does the same for the ones nearest the worst. Every real
 * number lands somewhere useful, so the setting takes anything.
 */
function rampFromBest(distance: number, curve: number): number {
  if (curve === 0) return distance;
  // bending away from best is the same curve read from the other end.
  // Feeding a negative straight to log1p would go imaginary past -1.
  if (curve < 0) return 1 - rampFromBest(1 - distance, -curve);

  return Math.log1p(curve * distance) / Math.log1p(curve);
}

function colorFor(
  speed: number | undefined,
  min: number | undefined,
  max: number | undefined,
  reverse = false,
  curve = DEFAULT_CURVE,
) {
  if (!speed || !min || !max) return;

  const normalized = (speed - min) / (max - min);
  const color = gradient(rampFromBest(reverse ? 1 - normalized : normalized, curve));

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

function speedsFor(columns: Column[], benchInfo: BenchmarkInfo, percentile: Percentile) {
  const speeds: Record<string, number | undefined> = {};
  let min = Infinity;
  let max = -Infinity;

  for (const column of columns) {
    const time = timeFor(column.data, column.framework, benchInfo, percentile);

    if (time === undefined) continue;

    speeds[column.key] = time;

    if (time > max) max = time;
    if (time < min) min = time;
  }

  return { speeds, min, max };
}

class TableRow extends Component<{
  benchInfo: BenchmarkInfo;
  columns: Column[];
}> {
  @service declare router: RouterService;

  /**
   * Derived, not constructor-assigned: the percentile is read off the URL,
   * so every one of these has to fall out again when it changes.
   */
  @cached
  get row() {
    // a borrowed column is one of these, so it widens the row's range on
    // its own rather than having to be folded in afterwards
    const { speeds, min, max } = speedsFor(
      this.args.columns,
      this.args.benchInfo,
      percentileFrom(this.router),
    );

    const reverse = this.args.benchInfo.whatsBetter === "bigger";
    const curve = curveFrom(this.router);
    const colors: Record<string, string | undefined> = {};

    for (const column of this.args.columns) {
      colors[column.key] = colorFor(speeds[column.key], min, max, reverse, curve);
    }

    return { speeds, min, max, colors };
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

  value = (key: string) => this.displayOf(this.row.speeds[key]);

  <template>
    <tr>
      <BenchmarkName @bench={{@benchInfo}} />

      {{#each @columns as |column|}}
        <td
          class={{if column.borrowedFrom "borrowed"}}
          style="background: {{get this.colors column.key}};"
        ><span class="value">{{this.value column.key}}</span></td>
      {{/each}}
    </tr>
  </template>
}

class Table extends Component<{
  benches: BenchmarkInfo[];
  /** the run the page is showing, to compare a borrowed column's setup against */
  file: ResultSet;
  columns: Column[];
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
    // byKey rather than a flat record: column keys are arbitrary now, so
    // min/max can no longer share a namespace with them
    const byKey: Record<string, number> = {};
    let min = Infinity;
    let max = -Infinity;

    if (!this.shouldShowTotals) return { byKey, min, max };

    for (const column of this.args.columns) {
      let total = 0;

      for (const bench of this.args.benches) {
        const time = timeFor(column.data, column.framework, bench, this.percentile);

        if (time === undefined) continue;

        total += time;
      }

      byKey[column.key] = round(total);

      if (total > max) max = total;
      if (total < min) min = total;
    }

    return { byKey, min, max };
  }

  /**
   * Timings are only comparable at the same CPU throttle, so a borrowed
   * column recorded at a different one has to say so in its header.
   */
  throttleMismatch = (column: Column) => {
    if (!column.borrowedFrom) return;

    const theirs = column.data.args?.CPU_THROTTLE;

    if ((theirs ?? null) === (this.args.file.args?.CPU_THROTTLE ?? null)) return;

    return throttleLabel(theirs);
  };

  /**
   * Every bench in one area shares a direction, so the totals row reads
   * in that area's direction too.
   */
  get bestIsMax() {
    return this.args.benches[0]?.whatsBetter === "bigger";
  }

  totalColor = (key: string) =>
    colorFor(
      this.totals.byKey[key],
      this.totals.min,
      this.totals.max,
      this.bestIsMax,
      curveFrom(this.router),
    );

  totalValue = (key: string) => {
    const total = this.totals.byKey[key];

    switch (modeFrom(this.router)) {
      case "linear":
        return scoreFor(total, this.totals.min, this.totals.max);
      case "times": {
        // times-best of the raw totals, so the best column reads 1x
        const ratio = timesBestFor(total, this.totals.min, this.totals.max, this.bestIsMax);

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
          {{#each @columns as |column|}}
            <th class="fw-header {{if column.borrowedFrom 'borrowed'}}">
              {{#if column.borrowedFrom}}
                {{! which borrow this is; the run it names is spelled out on
                    the borrow picker, so the header only carries the letter }}
                <span
                  class="borrow-label"
                  title="borrowed from {{formatRunName column.borrowedFrom}}"
                >{{column.label}}</span>
              {{/if}}
              <FrameworkInfo @name={{column.framework}} />
              <Variant @variant={{variantOf column.data column.framework}} />
              <span class="small">
                <Version
                  @version={{versionOf column.data column.framework}}
                  @override={{overrideOf column.data column.framework}}
                />
              </span>
              {{! only borrowed columns can mismatch, and only a mismatch is
                  worth the reader's attention }}
              {{#let (this.throttleMismatch column) as |mismatch|}}
                {{#if mismatch}}
                  <span class="small throttle-mismatch">{{mismatch}}</span>
                {{/if}}
              {{/let}}
            </th>
          {{/each}}
        </tr>
      </thead>
      <tbody>
        {{#each @benches as |bench|}}
          <TableRow @benchInfo={{bench}} @columns={{@columns}} />
        {{/each}}
      </tbody>

      {{#if this.shouldShowTotals}}
        <tfoot>
          <tr><th style="text-align: right">Total</th>
            {{#each @columns as |column|}}
              <td
                class={{if column.borrowedFrom "borrowed"}}
                style="background: {{this.totalColor column.key}}"
              >
                <span class="value">{{this.totalValue column.key}}</span>
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

  get curve() {
    return curveFrom(this.router);
  }

  setCurve = (event: Event) => {
    const { valueAsNumber } = event.target as HTMLInputElement;

    // Half-typed input is briefly unparseable -- "", "-", "0." -- and this
    // fires on every keystroke. Keep the last good curve instead of writing
    // a fallback back into the field, which would eat the keystroke and
    // make a negative impossible to type.
    if (!Number.isFinite(valueAsNumber)) return;

    this.router.transitionTo({
      queryParams: { curve: valueAsNumber === DEFAULT_CURVE ? null : valueAsNumber },
    });
  };

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

  @cached
  get columns() {
    return columnsFor(this.file, this.visibleFrameworks, this.borrow);
  }

  settingParams = ["mode", "p", "hide", "from", "sort", "curve"];

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

    if (!sort) return this.columns;

    return sortedByTotal(this.columns, benches, this.percentile, sort);
  }

  @cached
  get higherColumns() {
    return this.sorted(this.higherBenches);
  }

  @cached
  get lowerColumns() {
    return this.sorted(this.lowerBenches);
  }

  <template>
    <Settings @params={{this.settingParams}}>
      <fieldset class="value-mode surface">
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

      <fieldset class="value-mode surface">
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

      <fieldset class="value-mode surface">
        <legend>color curve</legend>
        <label>
          <input
            type="number"
            name="color-curve"
            step="0.1"
            value={{this.curve}}
            {{on "input" this.setCurve}}
          />
          bend toward best
        </label>
        <span class="units">0 is a straight ramp; negative bends toward the tail</span>
      </fieldset>

      <SortControl />

      <FrameworkToggles @file={{this.file}} />

      <BorrowPicker @borrowed={{@model.borrowed}} />
    </Settings>

    {{#if this.higherBenches.length}}
      <h2>higher is better</h2>

      <Table @benches={{this.higherBenches}} @file={{this.file}} @columns={{this.higherColumns}} />
      <br />
      <br />
      <br />
    {{/if}}

    {{#if this.lowerBenches.length}}
      <h2>lower is better</h2>

      <Table @benches={{this.lowerBenches}} @file={{this.file}} @columns={{this.lowerColumns}} />
      <br />
      <br />
      <br />
    {{/if}}
  </template>
}
