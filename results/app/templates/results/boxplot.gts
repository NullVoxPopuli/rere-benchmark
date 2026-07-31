import Component from "@glimmer/component";
import { service } from "@ember/service";

// https://github.com/sgratzl/chartjs-chart-boxplot
import { BoxPlotChart } from "@sgratzl/chartjs-chart-boxplot";
import { converter, filterBrightness, formatCss } from "culori";
import { modifier } from "ember-modifier";

import { borrowOf, BorrowPicker } from "#components/borrow-picker.gts";
import { FrameworkToggles, visibleFrameworksOf } from "#components/framework-toggles.gts";
import { Settings } from "#components/settings.gts";
import { frameworks } from "#frameworks";
import { formatRunName, samplesOf } from "#utils";

import type RouterService from "@ember/routing/router-service";
import type { Borrow } from "#components/borrow-picker.gts";
import type { Model } from "#routes/results.ts";
import type { BenchmarkInfo, ResultSet } from "#types";

const HSL = converter("hsl");
const BRIGHTEN = filterBrightness(1.5, "lrgb");
const DARKEN = filterBrightness(0.5, "lrgb");

function boxData(
  file: ResultSet,
  benchInfo: BenchmarkInfo,
  frameworkNames: string[],
  borrow: Borrow | undefined,
) {
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

  for (const framework of frameworkNames) {
    add(framework, file, framework);
  }

  if (borrow) {
    add([borrow.framework, `from ${formatRunName(borrow.name)}`], borrow.data, borrow.framework);
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
  [file, benchInfo, frameworkNames, borrow]: [
    ResultSet,
    BenchmarkInfo,
    string[],
    Borrow | undefined,
  ],
) {
  const { datasets, labels } = boxData(file, benchInfo, frameworkNames, borrow);
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
  @service declare router: RouterService;

  get benchmarkInfo() {
    return this.args.model.data.benchmarkInfo
      .toSorted()
      .toSorted((a, b) => (a.name.includes("async") ? 1 : 0) - (b.name.includes("async") ? 1 : 0));
  }

  get frameworks() {
    return visibleFrameworksOf(this.router, this.args.model.data);
  }

  settingParams = ["hide", "from"];

  get borrow() {
    return borrowOf(this.router, this.args.model.borrowed);
  }

  get rows() {
    return this.frameworks.length + (this.borrow ? 1 : 0);
  }

  get height() {
    return 70 * this.rows;
  }

  <template>
    <Settings @params={{this.settingParams}}>
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
          <canvas {{renderChart @model.data benchInfo this.frameworks this.borrow}}></canvas>
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
