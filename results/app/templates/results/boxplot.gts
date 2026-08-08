import Component from "@glimmer/component";
import { cached } from "@glimmer/tracking";
import { service } from "@ember/service";

// https://github.com/sgratzl/chartjs-chart-boxplot
import { BoxPlotChart } from "@sgratzl/chartjs-chart-boxplot";
import { converter, filterBrightness, formatCss } from "culori";
import { modifier } from "ember-modifier";

import { borrowOf, BorrowPicker } from "#components/borrow-picker.gts";
import { FrameworkToggles, visibleFrameworksOf } from "#components/framework-toggles.gts";
import { Settings } from "#components/settings.gts";
import { SortControl } from "#components/sort-control.gts";
import { frameworks } from "#frameworks";
import {
  columnsFor,
  formatRunName,
  higherIsBetterBenches,
  lowerIsBetterBenches,
  percentileFrom,
  samplesOf,
  sortedByTotal,
  totalSortFrom,
} from "#utils";

import type { Model } from "#routes/results.ts";
import type QueryParams from "#services/query-params.ts";
import type { BenchmarkInfo, Column, ResultSet } from "#types";

const HSL = converter("hsl");
const BRIGHTEN = filterBrightness(1.5, "lrgb");
const DARKEN = filterBrightness(0.5, "lrgb");

function boxData(benchInfo: BenchmarkInfo, columns: Column[]) {
  // Why is chartjs like this?
  // managing this many arrays in sync across indicies is annoying
  const labels: Array<string | string[]> = [];
  const data: number[][] = [];
  const backgroundColor: string[] = [];
  const borderColor: string[] = [];
  const meanBorderColor: string[] = [];
  const medianColor: string[] = [];
  const lowerBackgroundColor: string[] = [];

  const add = (label: string | string[], source: ResultSet, framework: string) => {
    labels.push(label);

    const marks = source.results[framework]?.[benchInfo.name]?.times;

    data.push(marks ? samplesOf(marks, benchInfo.measure) : []);

    const baseColor = frameworks[framework]?.color ?? "#888";
    const hsl = HSL(baseColor);

    if (!hsl) {
      throw new Error(`Could not parse color: ${baseColor}`);
    }

    const brighter = formatCss(BRIGHTEN(hsl));
    const darker = formatCss(DARKEN(hsl));

    backgroundColor.push(baseColor);
    borderColor.push(baseColor);

    meanBorderColor.push(darker);
    medianColor.push(darker);
    // meanBackgroundColor

    lowerBackgroundColor.push(brighter);
  };

  for (const column of columns) {
    const label = column.borrowedFrom
      ? [column.framework, `from ${formatRunName(column.borrowedFrom)}`]
      : column.framework;

    add(label, column.data, column.framework);
  }

  const datasets = [
    {
      label: "",
      data,
      backgroundColor,
      borderColor,
      meanBorderWidth: 3,
      meanBorderColor,
      medianColor,
      lowerBackgroundColor,
    },
  ];

  console.debug(datasets);

  return { datasets, labels };
}

const renderChart = modifier(function boxplot(
  element: HTMLCanvasElement,
  [benchInfo, columns]: [BenchmarkInfo, Column[]],
) {
  const { datasets, labels } = boxData(benchInfo, columns);
  // https://www.sgratzl.com/chartjs-chart-boxplot/examples/styling.html
  const chart = new BoxPlotChart(element, {
    data: {
      labels,
      datasets,
    },
    options: {
      indexAxis: "y",
      responsive: true,
      // without this, chart.js picks its own height and the per-framework
      // rows get squashed until most axis labels are dropped
      maintainAspectRatio: false,
      transitions: {
        show: {
          animations: {
            y: {
              from: 0,
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: false,
        },
        x: {
          beginAtZero: false,
        },
      },
      plugins: {
        legend: {
          display: false,
        },
      },
    },
  });

  return () => chart.destroy();
});

/**
 * Boxplot:
 *   (all placements approx)
 *
 *     -----   <- max
 *       |
 *       |
 *       |
 *     -----   <- q3
 *     |   |
 *     |---|   <- median
 *     |   |
 *     |   |
 *     -----   <- q1
 *       |
 *       |
 *       |
 *     -----   <- min
 */

export default class Boxplat extends Component<{
  model: Model;
}> {
  @service declare queryParams: QueryParams;

  get benchmarkInfo() {
    return this.args.model.data.benchmarkInfo
      .toSorted()
      .toSorted((a, b) => (a.name.includes("async") ? 1 : 0) - (b.name.includes("async") ? 1 : 0));
  }

  get frameworks() {
    return visibleFrameworksOf(this.queryParams, this.args.model.data);
  }

  @cached
  get columns() {
    return columnsFor(this.args.model.data, this.frameworks, this.borrow);
  }

  sorted(benches: BenchmarkInfo[]) {
    const sort = totalSortFrom(this.queryParams);

    if (!sort) return this.columns;

    return sortedByTotal(this.columns, benches, percentileFrom(this.queryParams), sort);
  }

  @cached
  get higherColumns() {
    return this.sorted(higherIsBetterBenches(this.args.model.data.benchmarkInfo));
  }

  @cached
  get lowerColumns() {
    return this.sorted(lowerIsBetterBenches(this.args.model.data.benchmarkInfo));
  }

  columnsForBench = (benchInfo: BenchmarkInfo) =>
    isBiggerBetter(benchInfo) ? this.higherColumns : this.lowerColumns;

  settingParams = ["hide", "from", "sort"] as const;

  get borrow() {
    return borrowOf(this.queryParams, this.args.model.borrowed);
  }

  get rows() {
    return this.frameworks.length + (this.borrow ? 1 : 0);
  }

  get height() {
    return 70 * this.rows;
  }

  <template>
    <Settings @params={{this.settingParams}}>
      <SortControl />

      <FrameworkToggles @file={{@model.data}} />

      <BorrowPicker @borrowed={{@model.borrowed}} />
    </Settings>

    {{#each this.benchmarkInfo as |benchInfo|}}
      <section>
        <header class="boxplot-header">
          <h2>{{benchInfo.name}}</h2>
          <div class="right">
            <span class="small">{{benchInfo.units}}</span>
            <span class="which-is-better">
              {{#if (isBiggerBetter benchInfo)}}
                higher is better
              {{else}}
                lower is better
              {{/if}}
            </span>
          </div>
        </header>

        {{! chart.js responsive sizing tracks the parent element,
            so the fixed height goes on a wrapper, not the canvas }}
        <div style="position: relative; height:{{this.height}}px;">
          <canvas {{renderChart benchInfo (this.columnsForBench benchInfo)}}></canvas>
        </div>
      </section>
    {{/each}}

    <style scoped>
      section {
        /* the .all-results grid centers items at their content width,
           so without a definite width each chart shrink-wraps to its
           heading text and every chart ends up a different width */
        width: min(90vw, 60rem);
      }

      .boxplot-header {
        display: flex;
        align-items: center;

        h2 {
          flex: 1;
        }

        .right {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 0.25rem;
        }
      }
    </style>
  </template>
}

function isBiggerBetter(benchInfo: BenchmarkInfo) {
  return benchInfo.whatsBetter === "bigger";
}
