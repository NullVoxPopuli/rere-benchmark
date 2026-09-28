import Component from "@glimmer/component";
import { cached } from "@glimmer/tracking";
import { service } from "@ember/service";

import { FrameworkInfo } from "#components/framework-info.gts";
import { Variant } from "#components/variant.gts";
import { Version } from "#components/version.gts";
import {
  curveFrom,
  formatRunName,
  labelFor,
  overrideOf,
  percentileFrom,
  round,
  throttleLabel,
  timeFor,
  variantOf,
  versionOf,
} from "#utils";

import { colorFor, formatTimes, scoreFor, timesBestFor } from "./cell-values.ts";
import { TableRow } from "./table-row.gts";
import { modeFrom } from "./value-mode-control.gts";

import type QueryParams from "#services/query-params.ts";
import type { BenchmarkInfo, Column, ResultSet } from "#types";

export class Table extends Component<{
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
   * A getter, because the percentile is read off the URL,
   * and the totals have to fall out again when it changes.
   */
  @cached
  get totals() {
    // column keys are arbitrary,
    // so min/max cannot share a namespace with them
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
    {{! wide tables widen the page itself,
        so the sticky header row and benchmark-name column can pin against the viewport }}
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
                {{! which borrow this is.
                    The borrow picker spells out the run it names,
                    so the header only carries the letter }}
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
              {{! only borrowed columns can mismatch,
                  and only a mismatch is worth the reader's attention }}
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
