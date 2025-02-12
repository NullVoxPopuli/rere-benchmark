import type { Model } from '#routes/results.ts';
import type { Result, ResultData } from '#types';
import { dataOf, getBenchNames, getFrameworks, round } from '#utils';
import type { TOC } from '@ember/component/template-only';
import { on } from '@ember/modifier';
import { tracked } from '@glimmer/tracking';
import { interpolate } from 'culori';

function pivot(data: ResultData, showManuallyBatched: boolean) {
  const frameworks = getFrameworks(data);

  let benchNames = [...getBenchNames(data)];

  if (!showManuallyBatched) {
    benchNames = benchNames.filter((x) => !x.includes('manual batching'));
  } else {
    benchNames = benchNames.filter((x) => x.includes('manual batching'));
  }

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

function maxTotal({
  rows,
  frameworks,
}: {
  rows: Record<string, Result[]>;
  frameworks: string[];
}) {
  const totals = frameworks.map((fw) => totalFor(rows, fw));

  return Math.max(...totals);
}
function minTotal({
  rows,
  frameworks,
}: {
  rows: Record<string, Result[]>;
  frameworks: string[];
}) {
  const totals = frameworks.map((fw) => totalFor(rows, fw));

  return Math.min(...totals);
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

class ShowManuallyBatched {
  @tracked current = true;
  toggle = () => (this.current = !this.current);
}

const manuallyChecked = new ShowManuallyBatched();

export default <template>
  <label>
    Show Manually Batched
    <input
      type="checkbox"
      checked={{manuallyChecked.current}}
      {{on "change" manuallyChecked.toggle}}
    />
  </label>

  {{#let (pivot @model.data.results manuallyChecked.current) as |p|}}
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
            <td style="text-align: right;">{{name}}</td>
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
        <tr><th style="text-align: right">Total</th>
          {{#let (maxTotal p) (minTotal p) as |max min|}}
            {{#each p.frameworks as |framework|}}
              {{#let (totalFor p.rows framework) as |total|}}
                <td style="background: {{colorFor total min max}}">
                  {{total}}
                </td>
              {{/let}}
            {{/each}}
          {{/let}}
        </tr>
      </tfoot>
    </table>
  {{/let}}
</template> satisfies TOC<{
  model: Model;
}>;
