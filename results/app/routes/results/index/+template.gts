import Component from "@glimmer/component";
import { cached } from "@glimmer/tracking";
import { service } from "@ember/service";

import {
  columnsFor,
  higherIsBetterBenches,
  msBenchGroups,
  percentileFrom,
  sortedByTotal,
  totalSortFrom,
} from "#utils";

import { borrowsOf } from "../borrow-picker.gts";
import { visibleFrameworksOf } from "../framework-toggles.gts";
import { Table } from "./table.gts";
import { TableSettings } from "./table-settings.gts";
import { splitsFrom } from "./table-splits.gts";

import type { Model } from "../+route.ts";
import type QueryParams from "#services/query-params.ts";
import type { BenchmarkInfo } from "#types";
import type { Percentile } from "#utils";

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

    <div class="result-tables">
      {{#if this.higherBenches.length}}
        <h2>higher is better</h2>

        <Table
          @benches={{this.higherBenches}}
          @file={{this.file}}
          @columns={{this.higherColumns}}
        />
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
    </div>

    <style scoped>
      .result-tables {
        display: grid;
        justify-items: end;
      }
    </style>
  </template>
}
