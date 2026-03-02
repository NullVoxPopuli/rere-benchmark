import Component from '@glimmer/component';
import { modifier } from 'ember-modifier';
import type { Model } from '#routes/results.ts';
import type { BenchmarkInfo, ResultSet } from '#types';
// https://github.com/sgratzl/chartjs-chart-boxplot
import { BoxPlotChart } from '@sgratzl/chartjs-chart-boxplot';
import { frameworks } from '#frameworks';
import { parse, converter, filterBrightness, formatCss } from 'culori';

const HSL = converter('hsl');
const BRIGHTEN = filterBrightness(1.5, 'lrgb');
const DARKEN = filterBrightness(0.5, 'lrgb');

function boxData(file: ResultSet, benchInfo: BenchmarkInfo) {
  // Why is chartjs like this?
  // managing this many arrays in sync across indicies is annoying
  const labels: string[] = [];
  const data: number[][] = [];
  const backgroundColor: string[] = [];
  const borderColor: string[] = [];
  const meanBorderColor: string[] = [];
  const medianColor: string[] = [];
  const lowerBackgroundColor: string[] = [];

  for (const framework of file.selections.frameworks) {
    labels.push(framework);
    const marks = file.results[framework]?.[benchInfo.name]?.times;
    let frameworkData: number[] = [];

    if (benchInfo.whatsBetter === 'bigger') {
      frameworkData = marks
        .flat()
        .filter((mark) => mark.name === benchInfo.measure)
        .map((mark) => mark.detail);
    } else {
      frameworkData = marks
        ?.filter((x) => x.length === 2)
        .map((x) => x[1]!.at - x[0]!.at);
    }

    data.push(frameworkData);

    const baseColor = frameworks[framework]?.color ?? '#888';
    const parsed = parse(baseColor);
    const hsl = HSL(baseColor);
    const brighter = formatCss(BRIGHTEN(hsl));
    const darker = formatCss(DARKEN(hsl));

    console.log(parsed, hsl);

    backgroundColor.push(baseColor);
    borderColor.push(baseColor);

    meanBorderColor.push(darker);
    medianColor.push(darker);
    // meanBackgroundColor

    lowerBackgroundColor.push(brighter);
  }

  const datasets = [
    {
      label: '',
      data,
      backgroundColor,
      borderColor,
      meanBorderWidth: 3,
      meanBorderColor,
      medianColor,
      lowerBackgroundColor,
    },
  ];

  console.log(datasets);

  return { datasets, labels };
}

const renderChart = modifier(function boxplot(
  element: HTMLCanvasElement,
  [file, benchInfo]: [ResultSet, BenchmarkInfo]
) {
  const { datasets, labels } = boxData(file, benchInfo);
  // https://www.sgratzl.com/chartjs-chart-boxplot/examples/styling.html
  const chart = new BoxPlotChart(element, {
    data: {
      labels,
      datasets,
    },
    options: {
      indexAxis: 'y',
      responsive: true,
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
  get benchmarkInfo() {
    return this.args.model.data.benchmarkInfo
      .toSorted()
      .toSorted(
        (a, b) =>
          (a.name.includes('async') ? 1 : 0) -
          (b.name.includes('async') ? 1 : 0)
      );
  }

  get frameworks() {
    return this.args.model.data.selections.frameworks;
  }

  get height() {
    return 70 * this.frameworks.length;
  }

  <template>
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

        <canvas
          style="height:{{this.height}}px; max-width: 90dvw;"
          {{renderChart @model.data benchInfo}}
        ></canvas>
      </section>
    {{/each}}

    <style scoped>
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
  return benchInfo.whatsBetter === 'bigger';
}
