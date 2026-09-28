import Component from "@glimmer/component";
import { cached } from "@glimmer/tracking";
import { assert } from "@ember/debug";
import { service } from "@ember/service";

import { FrameworkInfo } from "#components/framework-info.gts";
import { Variant } from "#components/variant.gts";
import { Version } from "#components/version.gts";
import { frameworks } from "#frameworks";
import {
  columnsFor,
  formatRunName,
  overrideOf,
  percentileFrom,
  round,
  timeFor,
  variantOf,
  versionOf,
} from "#utils";

import { BorrowPicker, borrowsOf } from "../borrow-picker.gts";
import { FrameworkToggles, visibleFrameworksOf } from "../framework-toggles.gts";
import { PercentileControl } from "../percentile-control.gts";
import { Settings } from "../settings.gts";

import type { Model } from "../+route.ts";
import type QueryParams from "#services/query-params.ts";
import type { BenchmarkInfo, Column } from "#types";

/** One racer: where its time came from, and the time itself. */
interface Row {
  column: Column;
  speed: number;
}

export default class Animated extends Component<{
  model: Model;
}> {
  @service declare queryParams: QueryParams;

  get percentile() {
    return percentileFrom(this.queryParams);
  }

  get benchmarkInfo() {
    return this.args.model.data.benchmarkInfo
      .toSorted()
      .toSorted((a, b) => (a.name.includes("async") ? 1 : 0) - (b.name.includes("async") ? 1 : 0));
  }

  // no sort control: the rows already order themselves by measured speed
  settingParams = ["p", "hide", "from"] as const;

  get borrows() {
    return borrowsOf(this.queryParams, this.args.model.borrowed);
  }

  @cached
  get columns() {
    return columnsFor(
      this.args.model.data,
      visibleFrameworksOf(this.queryParams, this.args.model.data),
      this.borrows,
    );
  }

  rowsFor = (benchInfo: BenchmarkInfo): Row[] => {
    const rows: Row[] = [];

    for (const column of this.columns) {
      // a borrowed run doesn't necessarily cover every benchmark
      const speed = timeFor(column.data, column.framework, benchInfo, this.percentile);

      if (speed === undefined) continue;

      rows.push({ column, speed });
    }

    return rows;
  };

  <template>
    <Settings @params={{this.settingParams}}>
      <PercentileControl />

      <FrameworkToggles @file={{@model.data}} />

      <BorrowPicker @borrowed={{@model.borrowed}} />
    </Settings>

    {{#each this.benchmarkInfo as |benchInfo|}}
      <Visualize @benchInfo={{benchInfo}} @rows={{this.rowsFor benchInfo}} />
    {{/each}}
  </template>
}

function scaleFactor(rows: Row[]) {
  const fastest = rows[0];

  assert(`Results are empty`, fastest);

  const scale = fastest.speed;

  return (ms: number) => ms / scale;
}

function scaleFromBigger(rows: Row[]) {
  const max = Math.max(...rows.map((r) => r.speed));

  assert(`Results are empty`, max);

  return (ms: number) => {
    const result = max / ms;

    // console.log({ ms, max, result });
    return result;
  };
}

function sortBigger(rows: Row[]) {
  return rows.toSorted((a, b) => b.speed - a.speed);
}

function sortSmaller(rows: Row[]) {
  return rows.toSorted((a, b) => a.speed - b.speed);
}

function colorOf(framework: string) {
  return frameworks[framework]?.color ?? "#888";
}

export class Visualize extends Component<{
  benchInfo: BenchmarkInfo;
  rows: Row[];
}> {
  @cached
  get scaleTime() {
    if (this.args.benchInfo.whatsBetter === "bigger") {
      return scaleFromBigger(this.args.rows);
    }

    return scaleFactor(this.args.rows);
  }

  @cached
  get sorted() {
    if (this.args.benchInfo.whatsBetter === "bigger") {
      return sortBigger(this.args.rows);
    }

    return sortSmaller(this.args.rows);
  }

  get isBiggerBetter() {
    return this.args.benchInfo.whatsBetter === "bigger";
  }

  <template>
    <section class="languages-container">
      <h2>{{@benchInfo.name}}</h2>
      <span>{{#if this.isBiggerBetter}}
          higher is better
        {{else}}
          lower is better
        {{/if}}
      </span>

      <table>
        <thead></thead>

        <tbody>
          {{#each this.sorted key="column.key" as |row|}}
            <tr>
              <td>
                {{#if row.column.borrowedFrom}}
                  {{! which borrow this is; the run it names is spelled out on
                      the borrow picker, so the row only carries the letter }}
                  <span
                    class="borrow-label"
                    title="borrowed from {{formatRunName row.column.borrowedFrom}}"
                  >{{row.column.label}}</span>
                {{/if}}
                <FrameworkInfo @name={{row.column.framework}} />
                <Variant @variant={{variantOf row.column.data row.column.framework}} />
              </td>
              <td class="time">{{round row.speed}}
                {{@benchInfo.units}}
                <br />
                <span class="small">
                  <Version
                    @version={{versionOf row.column.data row.column.framework}}
                    @override={{overrideOf row.column.data row.column.framework}}
                  />
                </span>
              </td>
              <td>
                <svg width="100%" height="48" viewBox="0 0 400 48">
                  <circle cx="50" cy="24" r="10" fill={{colorOf row.column.framework}}>
                    <animate
                      attributeName="cx"
                      values="50; 350; 50"
                      keyTimes="0; 0.5; 1"
                      dur="{{this.scaleTime row.speed}}s"
                      repeatCount="indefinite"
                    />
                  </circle>
                </svg>
              </td>
            </tr>
          {{/each}}
        </tbody>
      </table>
    </section>

    <style>
      tr td {
        border-bottom: 1px solid lightgray;
      }
      /* anchors the absolutely-positioned borrow badge to its row's
         framework cell, the way the results table's headers do */
      tr td:first-child {
        position: relative;
      }
      .time {
        font-style: italic;
        padding: 0 0.5rem;
      }
    </style>
  </template>
}
