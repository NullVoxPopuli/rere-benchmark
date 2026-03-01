import Component from '@glimmer/component';
import { modifier } from 'ember-modifier';
import type { Model } from '#routes/results.ts';
import type { BenchmarkInfo, ResultData, ResultSet } from '#types';
// https://github.com/sgratzl/chartjs-chart-boxplot
import { BoxPlotChart } from '@sgratzl/chartjs-chart-boxplot';
import { frameworks } from '#frameworks';

function boxData(results: ResultData, name: string) {
  const labels = [];
  const datasets = [];
  const datas = [];
  for (const [framework, benchmarks] of Object.entries(results)) {
    labels.push(framework);
    const baseColor = frameworks[framework]?.color;

    for (const [benchName, benchData] of Object.entries(benchmarks)) {
      if (benchName !== name) continue;
      const times = benchData.times
        .filter((x) => x.length === 2)
        .map((x) => x[1]!.at - x[0]!.at);
      datas.push(times);
    }
  }

  datasets.push({
    label: name,
    data: datas,
    borderColor: 'gray',
    medianColor: '#99ff99',
    lowerBackgroundColor: '#77ff77',
    outlierBackgroundColor: 'black',
  });

  return { labels, datasets };
}

const renderChart = modifier(function boxplot(
  element: HTMLCanvasElement,
  [file, benchInfo]: [ResultSet, BenchmarkInfo]
) {
  const name = benchInfo.name;
  const data = boxData(results, name);
  // https://www.sgratzl.com/chartjs-chart-boxplot/examples/styling.html
  const chart = new BoxPlotChart(element, {
    data,
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
