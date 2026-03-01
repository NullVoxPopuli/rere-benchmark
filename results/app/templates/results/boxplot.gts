import Component from '@glimmer/component';
import { modifier } from 'ember-modifier';
import type { Model } from '#routes/results.ts';
import type { BenchmarkInfo, ResultSet } from '#types';
// https://github.com/sgratzl/chartjs-chart-boxplot
import { BoxPlotChart } from '@sgratzl/chartjs-chart-boxplot';
import { frameworks } from '#frameworks';

function boxData(file: ResultSet, benchInfo: BenchmarkInfo) {
  const labels = [];
  const datasets = [];

  for (const framework of file.selections.frameworks) {
    labels.push(framework);
    const marks = file.results[framework]?.[benchInfo.name]?.times;
    const baseColor = frameworks[framework]?.color;
    let data: number[] = [];

    if (benchInfo.whatsBetter === 'bigger') {
      data = marks
        .flat()
        .filter((mark) => mark.name === benchInfo.measure)
        .map((mark) => mark.detail);
    } else {
      data = marks
        ?.filter((x) => x.length === 2)
        .map((x) => x[1]!.at - x[0]!.at);
    }

    console.log({ framework, data, marks });

    datasets.push({
      label: framework,
      data: [data],
      borderColor: 'gray',
      medianColor: '#99ff99',
      lowerBackgroundColor: baseColor,
      outlierBackgroundColor: 'black',
    });
  }

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
      labels: ['frameworks'],
      datasets,
    },
    options: {
      responsive: true,
      interaction: {
        mode: 'y',
      },
      elements: {
        boxandwhiskers: {
          itemRadius: 2,
          itemHitRadius: 4,
        },
      },
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
        legend: {},
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
        <h2>{{benchInfo.name}}</h2>
        <span class="small">{{benchInfo.units}}</span>

        <canvas
          style="height:500px; max-width: 90dvw;"
          {{renderChart @model.data benchInfo}}
        ></canvas>
      </section>
    {{/each}}
  </template>
}
