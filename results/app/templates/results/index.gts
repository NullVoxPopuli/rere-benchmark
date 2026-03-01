import Component from '@glimmer/component';
import { FrameworkInfo } from '#components/framework-info.gts';
import type { Model } from '#routes/results.ts';
import type { Result, ResultData, ResultSet } from '#types';
import {
  dataOf,
  getBenchNames,
  getFrameworks,
  getFrameworkVersion,
  round,
} from '#utils';
import { interpolate } from 'culori';
import { cached } from '@glimmer/tracking';

function pivot(data: ResultData) {
  const frameworks = getFrameworks(data);

  const benchNames = [...getBenchNames(data)];
  benchNames.sort();
  benchNames.sort(
    (a, b) => (a.includes('async') ? 1 : 0) - (b.includes('async') ? 1 : 0)
  );

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
  const speeds = data.map((d) => d.speed).filter(Boolean);

  return Math.max(...speeds);
}
function min(data: Result[]) {
  const speeds = data.map((d) => d.speed).filter(Boolean);

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
function colorFor(
  speed: number | undefined,
  min: number,
  max: number,
  reverse = false
) {
  if (!speed) return;
  const interpolation = interpolate(
    reverse ? [start, end] : [end, start],
    'oklch'
  );

  const normalized = (speed - min) / (max - min);
  const color = interpolation(normalized);

  return `oklch(${color.l} ${color.c} ${color.h}deg)`;
}

function getColor(
  data: ResultSet,
  results: Result[],
  speed: number | undefined
) {
  if (!speed) return;

  const rmin = min(results);
  const rmax = max(results);

  if (data.whatsBetter === 'bigger') {
    return colorFor(speed, rmin, rmax, true);
  }
  return colorFor(speed, rmin, rmax);
}

/**
 * NOTE: we can only render one type of bench at a time
 * -    better = bigger
 * - or better = smaller
 *
 * This is for visual communication reasons,
 * not any technical reasons.
 */
export default class Table extends Component<{
  model: Model;
}> {
  get data() {
    return this.args.model.data;
  }

  get results() {
    return this.data.results;
  }

  @cached
  get pivotedData() {
    return pivot(this.results);
  }

  get rows() {
    return this.pivotedData.rows;
  }

  get frameworks() {
    return this.pivotedData.frameworks;
  }

  @cached
  get totals() {
    return {
      max: maxTotal(this.pivotedData),
      min: minTotal(this.pivotedData),
    };
  }

  get shouldShowTotals() {
    return Object.keys(this.pivotedData.rows).length > 1;
  }

  get isBiggerBetter() {
    return this.args.model.data.whatsBetter === 'bigger';
  }

  <template>
    <table>
      <thead>
        <tr>
          <th></th>
          {{#each this.frameworks as |framework|}}
            <th class="fw-header">
              <FrameworkInfo @name={{framework}} />
              <span class="small">
                {{getFrameworkVersion this.results framework}}
              </span>
            </th>
          {{/each}}
        </tr>
      </thead>
      <tbody>
        {{#each-in this.pivotedData.rows as |name data|}}
          <tr>
            <td style="text-align: right;">{{name}}</td>
            {{#each this.frameworks as |framework|}}
              {{#let (speedFor data framework) as |speed|}}
                <td style="background: {{getColor this.data data speed}};"><span
                    class="value"
                  >{{speed}}</span></td>
              {{/let}}
            {{/each}}
          </tr>
        {{/each-in}}
      </tbody>
      {{#if this.shouldShowTotals}}
        <tfoot>
          <tr><th style="text-align: right">Total</th>
            {{#each this.frameworks as |framework|}}
              {{#let (totalFor this.pivotedData.rows framework) as |total|}}
                <td
                  style="background: {{colorFor
                    total
                    this.totals.min
                    this.totals.max
                  }}"
                >
                  <span class="value">{{total}}</span>
                </td>
              {{/let}}
            {{/each}}
          </tr>
        </tfoot>
      {{/if}}
    </table>
  </template>
}
