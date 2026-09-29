import Component from "@glimmer/component";
import { cached } from "@glimmer/tracking";
import { get } from "@ember/helper";
import { service } from "@ember/service";

import { BenchmarkName } from "#components/benchmark-name.gts";
import { curveFrom, percentileFrom, skipReasonOf, timeFor } from "#utils";

import { colorFor, formatTimes, scoreFor, timesBestFor } from "./cell-values.ts";
import { modeFrom } from "./value-mode-control.gts";

import type QueryParams from "#services/query-params.ts";
import type { BenchmarkInfo, Column } from "#types";
import type { Percentile } from "#utils";

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

export class TableRow extends Component<{
  benchInfo: BenchmarkInfo;
  columns: Column[];
}> {
  @service declare queryParams: QueryParams;

  /**
   * A getter, because the percentile is read off the URL,
   * and every one of these has to fall out again when it changes.
   */
  @cached
  get row() {
    // a borrowed column is one of these,
    // so it widens the row's range on its own
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

  skipReason = (column: Column) => skipReasonOf(column.data, column.framework, this.args.benchInfo);

  <template>
    <tr>
      <BenchmarkName @bench={{@benchInfo}} />

      {{#each @columns as |column|}}
        <td
          class={{if column.borrowedFrom "borrowed"}}
          style="background: {{get this.colors column.key}};"
        >
          {{#let (this.skipReason column) as |reason|}}
            {{#if reason}}
              <span class="value skipped" title={{reason}}>n/a</span>
            {{else}}
              <span class="value">{{this.value column.key}}</span>
            {{/if}}
          {{/let}}
        </td>
      {{/each}}
    </tr>

    <style scoped>
      /* the reason is only in the tooltip, so the cell has to invite a hover */
      .skipped {
        cursor: help;
        text-decoration: underline dotted;
      }
    </style>
  </template>
}
