import { Info } from '#components/env.gts';
import type { Model } from '#routes/results.ts';
import type { Result, ResultData } from '#types';
import { dataOf, getBenchNames, getFrameworks, round } from '#utils';
import type { TOC } from '@ember/component/template-only';
import { interpolate } from 'culori';

function pivot(data: ResultData) {
  const frameworks = getFrameworks(data);

  const benchNames = [...getBenchNames(data)];

  const result: Record<string, Result[]> = {};

  benchNames.forEach((x) => (result[x] = dataOf(data, x)));

  return { rows: result, frameworks };
}

function speedFor(data: Result[], framework: string) {
  const speed = data.find((d) => d.name === framework)?.speed;

  if (!speed) return;

  return round(speed);
}

function totalFor(data: Record<string, Result[]>, framework: string) {
  let total = 0;

  Object.entries(data).forEach(([, data]) => {
    const speed = speedFor(data, framework);

    total += speed || 0;
  });

  return round(total);
}

function max(data: Result[]) {
  const speeds = data.map((d) => d.speed);

  return Math.max(...speeds);
}
function min(data: Result[]) {
  const speeds = data.map((d) => d.speed);

  return Math.min(...speeds);
}

const start = '#ff7777';
const end = '#77ff77';
function colorFor(speed: number | undefined, min: number, max: number) {
  if (!speed) return;
  const interpolation = interpolate([end, start], 'oklch');

  const normalized = speed / (max - min);
  const color = interpolation(normalized);

  return `oklch(${color.l} ${color.c} ${color.h}deg)`;
}

export default <template>
  <Info @date={{@model.data.date}} @env={{@model.data.environment}} />

  <div class="all-results">
    {{#let (pivot @model.data.results) as |p|}}
      <table>
        <thead>
          <tr>
            <th></th>
            {{#each p.frameworks as |framework|}}
              <th>{{framework}}</th>
            {{/each}}
          </tr>
        </thead>
        <tbody>
          {{#each-in p.rows as |name data|}}
            <tr>
              <td>{{name}}</td>
              {{#each p.frameworks as |framework|}}
                {{#let (max data) (min data) as |max min|}}
                  {{#let (speedFor data framework) as |speed|}}
                    <td
                      style="background: {{colorFor speed min max}}"
                    >{{speed}}</td>
                  {{/let}}
                {{/let}}
              {{/each}}
            </tr>
          {{/each-in}}
        </tbody>
        <tfoot>
          <tr><th>Total</th>
            {{#each p.frameworks as |framework|}}
              <td>
                {{totalFor p.rows framework}}
              </td>
            {{/each}}
          </tr>
        </tfoot>
      </table>
    {{/let}}
  </div>
</template> satisfies TOC<{ model: Model }>;
