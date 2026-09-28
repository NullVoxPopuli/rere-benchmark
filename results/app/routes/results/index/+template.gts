import Component from "@glimmer/component";
import { cached } from "@glimmer/tracking";
import { get } from "@ember/helper";
import { service } from "@ember/service";

import { interpolate } from "culori";

import { BenchmarkName } from "#components/benchmark-name.gts";
import { FrameworkInfo } from "#components/framework-info.gts";
import { Variant } from "#components/variant.gts";
import { Version } from "#components/version.gts";
import {
  columnsFor,
  curveFrom,
  DEFAULT_CURVE,
  formatRunName,
  higherIsBetterBenches,
  labelFor,
  msBenchGroups,
  overrideOf,
  percentileFrom,
  round,
  sortedByTotal,
  throttleLabel,
  timeFor,
  totalSortFrom,
  variantOf,
  versionOf,
} from "#utils";

import { borrowsOf } from "../borrow-picker.gts";
import { visibleFrameworksOf } from "../framework-toggles.gts";
import { TableSettings } from "./table-settings.gts";
import { splitsFrom } from "./table-splits.gts";
import { modeFrom } from "./value-mode-control.gts";

import type { Model } from "../+route.ts";
import type QueryParams from "#services/query-params.ts";
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
  @service declare queryParams: QueryParams;

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
      percentileFrom(this.queryParams),
    );

    const reverse = this.args.benchInfo.whatsBetter === "bigger";
    const curve = curveFrom(this.queryParams);
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

    switch (modeFrom(this.queryParams)) {
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
  @service declare queryParams: QueryParams;

  get shouldShowTotals() {
    return this.args.benches.length > 1;
  }

  get percentile() {
    return percentileFrom(this.queryParams);
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
      curveFrom(this.queryParams),
    );

  totalValue = (key: string) => {
    const total = this.totals.byKey[key];

    switch (modeFrom(this.queryParams)) {
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

    <style scoped>
      table {
        /* names the statistic every cell in the table is, over the column of
           benchmark names it labels */
        .stat-label {
          text-align: right;
          font-weight: normal;
          font-size: 0.8rem;
          opacity: 0.6;
          white-space: nowrap;
        }

        /* No position of its own: `thead th` in app.css is already sticky,
           which both pins the row and gives the borrow badge something to
           anchor against. Setting position here outranks that rule, and the
           `top` meant for the sticky offset becomes a relative one -- shoving
           the headers a header-height down, over the first rows of the table. */
        .fw-header {
          text-align: center;
          vertical-align: bottom;
        }

        .throttle-mismatch {
          display: block;
          font-weight: normal;
          color: darkorange;
        }
      }
    </style>
  </template>
}

export default class ResultsTables extends Component<{
  model: Model;
}> {
  @service declare queryParams: QueryParams;

  get percentile(): Percentile {
    return percentileFrom(this.queryParams);
  }

  get file() {
    return this.args.model.data;
  }

  get borrows() {
    return borrowsOf(this.queryParams, this.args.model.borrowed);
  }

  get visibleFrameworks() {
    return visibleFrameworksOf(this.queryParams, this.file);
  }

  @cached
  get columns() {
    return columnsFor(this.file, this.visibleFrameworks, this.borrows);
  }

  get benchmarkInfo() {
    return this.args.model.data.benchmarkInfo;
  }

  @cached
  get higherBenches() {
    return higherIsBetterBenches(this.benchmarkInfo);
  }

  sorted(benches: BenchmarkInfo[]) {
    return sortedByTotal(this.columns, benches, this.percentile, totalSortFrom(this.queryParams));
  }

  @cached
  get higherColumns() {
    return this.sorted(this.higherBenches);
  }

  /**
   * The millisecond tables the reader asked for -- one by default, plus
   * one per checked split -- each sorted on its own totals.
   */
  @cached
  get msGroups() {
    return msBenchGroups(this.benchmarkInfo, splitsFrom(this.queryParams)).map((group) => ({
      heading: group.heading,
      benches: group.benches,
      columns: this.sorted(group.benches),
    }));
  }

  <template>
    <TableSettings
      @benchmarkInfo={{this.benchmarkInfo}}
      @file={{this.file}}
      @borrowed={{@model.borrowed}}
    />

    {{#if this.higherBenches.length}}
      <h2>higher is better</h2>

      <Table @benches={{this.higherBenches}} @file={{this.file}} @columns={{this.higherColumns}} />
      <br />
      <br />
      <br />
    {{/if}}

    {{#each this.msGroups key="heading" as |group|}}
      <h2>{{group.heading}}</h2>

      <Table @benches={{group.benches}} @file={{this.file}} @columns={{group.columns}} />
      <br />
      <br />
      <br />
    {{/each}}
  </template>
}
