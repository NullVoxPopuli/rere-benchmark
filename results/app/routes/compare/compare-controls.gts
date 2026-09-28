import Component from "@glimmer/component";
import { service } from "@ember/service";

import { experiments, runs } from "virtual:result-sets";

import { nameOf } from "#frameworks";
import { formatRunName, labelFor, percentileFrom, PERCENTILES, titleOf } from "#utils";

import { joinRuns } from "./+route.ts";

import type { NamedRun } from "./+route.ts";
import type { TOC } from "@ember/component/template-only";
import type RouterService from "@ember/routing/router-service";
import type QueryParams from "#services/query-params.ts";
import type { Percentile } from "#utils";

/**
 * The comparison runs are lettered after the baseline: B, C, D, ...
 */
export function letterFor(index: number) {
  return String.fromCharCode(66 + index);
}

/**
 * The options for one of the run selectors:
 * the official runs, plus the experiments in their own group when there are any.
 *
 * Any selector can point at either category,
 * so a run can be compared against an experiment.
 */
const RunOptions = <template>
  <optgroup label="Runs">
    {{#each runs as |name|}}
      <option value={{name}} selected={{eq name @current}} title={{titleOf name}}>{{formatRunName
          name
        }}</option>
    {{/each}}
  </optgroup>
  {{#if experiments.length}}
    <optgroup label="Experiments">
      {{#each experiments as |name|}}
        <option value={{name}} selected={{eq name @current}} title={{titleOf name}}>{{formatRunName
            name
          }}</option>
      {{/each}}
    </optgroup>
  {{/if}}
</template> satisfies TOC<{
  current: string;
}>;

export class CompareControls extends Component<{
  a: NamedRun;
  bs: NamedRun[];
  /** the framework on screen, after falling back from an unknown ?framework= */
  framework: string;
  frameworkNames: string[];
}> {
  @service declare router: RouterService;
  @service declare queryParams: QueryParams;

  get a() {
    return this.args.a;
  }

  get bs() {
    return this.args.bs;
  }

  setFramework = (event: Event) => {
    const { value } = event.target as HTMLSelectElement;

    this.router.transitionTo({ queryParams: { framework: value } });
  };

  setRunA = (event: Event) => {
    const { value } = event.target as HTMLSelectElement;

    this.router.transitionTo({ queryParams: { a: value } });
  };

  bNames = () => this.bs.map((run) => run.name);

  setRunB = (index: number, event: Event) => {
    const { value } = event.target as HTMLSelectElement;
    const names = this.bNames();

    names[index] = value;
    this.router.transitionTo({ queryParams: { b: joinRuns(names) } });
  };

  /**
   * Another column to compare against A.
   *
   * That is the newest run not already in the comparison.
   * Without one, it is an unused experiment,
   * and once everything is on screen, the newest run again.
   */
  addRun = () => {
    const used = new Set([this.a.name].concat(this.bNames()));
    const next =
      runs.find((name) => !used.has(name)) ??
      experiments.find((name) => !used.has(name)) ??
      runs[0];

    if (!next) return;

    this.router.transitionTo({ queryParams: { b: joinRuns(this.bNames().concat([next])) } });
  };

  removeRun = (index: number) => {
    const names = this.bNames();

    names.splice(index, 1);
    this.router.transitionTo({ queryParams: { b: joinRuns(names) } });
  };

  get canRemove() {
    return this.bs.length > 1;
  }

  get canSwap() {
    return this.bs.length === 1;
  }

  swap = () => {
    // SAFETY: only reachable via canSwap, so there is exactly one comparee
    this.router.transitionTo({
      queryParams: { a: (this.bs[0] as NamedRun).name, b: this.a.name },
    });
  };

  isFramework = (name: string) => this.args.framework === name;

  percentiles = PERCENTILES;

  labelFor = labelFor;

  isPercentile = (percentile: Percentile) => percentileFrom(this.queryParams) === percentile;

  setPercentile = (event: Event) => {
    const { value } = event.target as HTMLSelectElement;

    this.router.transitionTo({ queryParams: { p: value } });
  };

  <template>
    <fieldset class="compare-controls">
      <legend>compare</legend>
      <label>
        framework
        <select name="framework" {{on "change" this.setFramework}}>
          {{#each @frameworkNames as |name|}}
            <option value={{name}} selected={{this.isFramework name}}>{{nameOf name}}</option>
          {{/each}}
        </select>
      </label>
      <label>
        run A
        <select name="run-a" {{on "change" this.setRunA}}>
          <RunOptions @current={{this.a.name}} />
        </select>
      </label>
      {{#each this.bs as |run index|}}
        <label>
          run
          {{letterFor index}}
          <select name="run-{{letterFor index}}" {{on "change" (fn this.setRunB index)}}>
            <RunOptions @current={{run.name}} />
          </select>
        </label>
        {{#if this.canRemove}}
          <button
            type="button"
            class="remove-run"
            aria-label="remove run {{letterFor index}}"
            {{on "click" (fn this.removeRun index)}}
          >×</button>
        {{/if}}
      {{/each}}
      <button type="button" {{on "click" this.addRun}}>+ add run</button>
      {{#if this.canSwap}}
        <button type="button" {{on "click" this.swap}}>swap A ⇄ B</button>
      {{/if}}
      <label>
        statistic
        <select name="percentile" {{on "change" this.setPercentile}}>
          {{#each this.percentiles as |percentile|}}
            <option value={{percentile}} selected={{this.isPercentile percentile}}>{{this.labelFor
                percentile
              }}</option>
          {{/each}}
        </select>
      </label>
    </fieldset>

    <style scoped>
      select {
        max-width: 40vw;
      }

      /* pulls each "remove run" button back against the selector it removes,
         undoing most of the control bar's column gap */
      .remove-run {
        margin-inline-start: -1rem;
        line-height: 1;
      }
    </style>
  </template>
}
