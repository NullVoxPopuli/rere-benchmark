import Component from '@glimmer/component';
import { modifier } from 'ember-modifier';
import type { Model } from '#routes/results.ts';
import type { BenchmarkInfo, ResultSet } from '#types';
// https://github.com/sgratzl/chartjs-chart-boxplot
import { BoxPlotChart } from '@sgratzl/chartjs-chart-boxplot';
import { frameworks } from '#frameworks';

function boxData(file: ResultSet, benchInfo: BenchmarkInfo) {
  const labels: string[] = [];
  const data: number[][] = [];
  const backgroundColor: string[] = [];
  const borderColor: string[] = [];

  for (const framework of file.selections.frameworks) {
    labels.push(framework);
    const marks = file.results[framework]?.[benchInfo.name]?.times;
    const baseColor = frameworks[framework]?.color ?? '#888';
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

    console.log({ framework, data: frameworkData, marks });

    data.push(frameworkData);
    backgroundColor.push(baseColor);
    borderColor.push(baseColor);
  }

  const datasets = [{ label: '', data, backgroundColor, borderColor }];

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
          style="height:500px; max-width: 90dvw;"
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
