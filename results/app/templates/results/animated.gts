import Component from "@glimmer/component";
import { cached } from "@glimmer/tracking";
import { assert } from "@ember/debug";
import { service } from "@ember/service";

import { FrameworkInfo } from "#components/framework-info.gts";
import { Variant } from "#components/variant.gts";
import { Version } from "#components/version.gts";
import { isBiggerBetter, percentileFrom, round } from "#utils";

import type RouterService from "@ember/routing/router-service";
import type { ResultSet } from "#result-set";
import type { Model } from "#routes/results.ts";
import type { BenchmarkInfo, Results } from "#types";

export default class Animated extends Component<{
  model: Model;
}> {
  @service declare router: RouterService;

  get percentile() {
    return percentileFrom(this.router);
  }

  get benchmarkInfo() {
    return this.args.model.data.orderedBenches;
  }

  <template>
    {{#each this.benchmarkInfo as |benchInfo|}}
      <Visualize
        @benchInfo={{benchInfo}}
        @set={{@model.data}}
        @results={{@model.data.rankingFor benchInfo.name this.percentile}}
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

  return (ms: number) => max / ms;
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
  set: ResultSet;
}> {
  @cached
  get scaleTime() {
    if (this.isBiggerBetter) {
      return scaleFromBigger(this.args.results);
    }

    return scaleFactor(this.args.results);
  }

  @cached
  get sorted() {
    if (this.isBiggerBetter) {
      return sortBigger(this.args.results);
    }

    return sortSmaller(this.args.results);
  }

  get isBiggerBetter() {
    return isBiggerBetter(this.args.benchInfo);
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
                <Variant @variant={{@set.variantOf fw.name}} />
              </td>
              <td class="time">{{round fw.speed}}
                {{fw.units}}
                <br />
                <span class="small">
                  <Version @version={{fw.version}} @override={{@set.overrideOf fw.name}} />
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
