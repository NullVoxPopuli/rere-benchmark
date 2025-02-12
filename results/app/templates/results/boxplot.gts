import { getBenchNames } from '#utils';
import { modifier } from 'ember-modifier';
import type { Model } from '#routes/results.ts';
import type { TOC } from '@ember/component/template-only';
import type { ResultData } from '#types';
// https://github.com/sgratzl/chartjs-chart-boxplot
import { BoxPlotChart } from '@sgratzl/chartjs-chart-boxplot';

function boxData(results: ResultData, name: string) {
  const labels = [];
  const datasets = [];
  const datas = [];
  for (const [framework, benchmarks] of Object.entries(results)) {
    labels.push(framework);

    for (const [benchName, benchData] of Object.entries(benchmarks)) {
      if (benchName !== name) continue;
      const times = benchData.times
        .filter((x) => x.length === 2)
        .map((x) => x[1].at - x[0].at);
      datas.push(times);
    }
  }

  datasets.push({
    label: name,
    data: datas,
  });

  return { labels, datasets };
}

const renderChart = modifier(function boxplot(
  element: HTMLCanvasElement,
  [results, name]: [ResultData, string]
) {
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

export default <template>
  {{#each (getBenchNames @model.data.results) as |name|}}
    <section>
      <h2>{{name}}</h2>
      <span class="small">times in milliseconds</span>

      <canvas
        style="height:500px"
        {{renderChart @model.data.results name}}
      ></canvas>
    </section>
  {{/each}}
</template> satisfies TOC<{ model: Model }>;
