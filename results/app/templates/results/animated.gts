import { dataOf } from '#utils';
import Component from '@glimmer/component';

import type { BenchmarkInfo, Results, ResultSet } from '#types';
import { assert } from '@ember/debug';
import { FrameworkInfo } from '#components/framework-info.gts';
import { round } from '#utils';
import { cached } from '@glimmer/tracking';
import type { Model } from '#routes/results.ts';

export default class Animated extends Component<{
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
      <Visualize
        @benchInfo={{benchInfo}}
        @file={{@model.data}}
        @results={{dataOf @model.data.results benchInfo.name}}
      />
    {{/each}}
  </template>
}

function scaleFactor(results: Results) {
  const fastest = results[0];
  assert(`Results are empty`, fastest);

  const scale = fastest.speed;
  return (ms: number) => ms / scale;
}

function scaleFromBigger(results: Results) {
  const max = Math.max(...results.map((r) => r.speed));
  assert(`Results are empty`, max);

  return (ms: number) => {
    const result = max / ms;
    // console.log({ ms, max, result });
    return result;
  };
}

function sortBigger(results: Results) {
  return results.toSorted((a, b) => b.speed - a.speed);
}

function sortSmaller(results: Results) {
  return results.toSorted((a, b) => a.speed - b.speed);
}

export class Visualize extends Component<{
  benchInfo: BenchmarkInfo;
  results: Results;
  file: ResultSet;
}> {
  @cached
  get scaleTime() {
    if (this.args.benchInfo.whatsBetter === 'bigger') {
      return scaleFromBigger(this.args.results);
    }

    return scaleFactor(this.args.results);
  }

  @cached
  get sorted() {
    if (this.args.benchInfo.whatsBetter === 'bigger') {
      return sortBigger(this.args.results);
    }

    return sortSmaller(this.args.results);
  }

  get isBiggerBetter() {
    return this.args.benchInfo.whatsBetter === 'bigger';
  }

  <template>
    <section class="languages-container">
      <h2>{{@benchInfo.name}}</h2>
      <span>{{#if this.isBiggerBetter}}
          higher is better
        {{else}}
          lower is better
        {{/if}}
      </span>

      <table>
        <thead></thead>

        <tbody>
          {{#each this.sorted as |fw|}}
            <tr>
              <td>
                <FrameworkInfo @name={{fw.name}} />
              </td>
              <td class="time">{{round fw.speed}}
                {{fw.units}}
                <br />
                <span class="small">
                  {{fw.version}}
                </span>
              </td>
              <td>
                <svg width="100%" height="48" viewBox="0 0 400 48">
                  <circle cx="50" cy="24" r="10" fill={{fw.color}}>
                    <animate
                      attributeName="cx"
                      values="50; 350; 50"
                      keyTimes="0; 0.5; 1"
                      dur="{{this.scaleTime fw.speed}}s"
                      repeatCount="indefinite"
                    />
                  </circle>
                </svg>
              </td>
            </tr>
          {{/each}}
        </tbody>
      </table>
    </section>

    <style>
      tr td {
        border-bottom: 1px solid lightgray;
      }
      .time {
        font-style: italic;
        padding: 0 0.5rem;
      }
    </style>
  </template>
}
