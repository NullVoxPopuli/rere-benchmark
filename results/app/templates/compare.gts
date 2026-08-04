import Component from "@glimmer/component";
import { cached } from "@glimmer/tracking";
import { LinkTo } from "@ember/routing";
import { service } from "@ember/service";

import { pageTitle } from "ember-page-title";
import { experiments, runs } from "virtual:result-sets";

import { BenchmarkName } from "#components/benchmark-name.gts";
import { FrameworkInfo } from "#components/framework-info.gts";
import { Variant } from "#components/variant.gts";
import { Version } from "#components/version.gts";
import { nameOf } from "#frameworks";
import { joinRuns } from "#routes/compare.ts";
import {
  formatRunName,
  getFrameworks,
  higherIsBetterBenches,
  isoOf,
  labelFor,
  lowerIsBetterBenches,
  overrideOf,
  percentileFrom,
  PERCENTILES,
  round,
  throttleLabel,
  timeFor,
  titleOf,
  variantOf,
  versionOf,
} from "#utils";

import type { TOC } from "@ember/component/template-only";
import type RouterService from "@ember/routing/router-service";
import type { Model, NamedRun } from "#routes/compare.ts";
import type { BenchmarkInfo, ResultSet } from "#types";
import type { Percentile } from "#utils";

/**
 * Below this |% change|, runs are considered equivalent -- individual
 * runs are noisy, so a fraction of a percent either way is meaningless.
 */
const SAME_THRESHOLD = 1;

function qp(runName: string) {
  return { q: runName };
}

/**
 * The comparison runs are lettered after the baseline: B, C, D, ...
 */
function letterFor(index: number) {
  return String.fromCharCode(66 + index);
}

/**
 * The options for one of the run selectors: the official runs, plus the
 * experiments in their own group when there are any. Any selector can
 * point at either category, so a run can be compared against an experiment.
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

/**
 * Both runs state their throttle outright rather than leaving it to be
 * inferred from the warning that only shows when they disagree.
 */
function throttleOf(file: ResultSet) {
  return throttleLabel(file.args?.CPU_THROTTLE);
}

function throttlesDiffer(a: ResultSet, b: ResultSet) {
  return (a.args?.CPU_THROTTLE ?? null) !== (b.args?.CPU_THROTTLE ?? null);
}

const RunHeader = <template>
  <th class="run-header">
    <LinkTo @route="results" @query={{qp @run.name}} title={{titleOf @run.name}}>
      <time datetime={{isoOf @run.name}}>{{formatRunName @run.name}}</time>
    </LinkTo>
    <span class="small">
      <Version
        @version={{versionOf @run.data @framework}}
        @override={{overrideOf @run.data @framework}}
      />
    </span>
    <span class="small throttle {{if @mismatch 'mismatch'}}">
      {{throttleOf @run.data}}
    </span>
  </th>
</template> satisfies TOC<{
  run: NamedRun;
  framework: string;
  mismatch: boolean;
}>;

interface Comparison {
  label: string;
  word: "better" | "worse" | "";
  direction: "better" | "worse" | "same";
}

function compareTimes(
  a: number | undefined,
  b: number | undefined,
  bestIsMax: boolean,
): Comparison | undefined {
  if (a === undefined || b === undefined) return;
  if (a <= 0) return;

  const delta = ((b - a) / a) * 100;
  const rounded = round(delta);
  const label = `${rounded > 0 ? "+" : ""}${rounded}%`;

  if (Math.abs(delta) < SAME_THRESHOLD) {
    return { label, word: "", direction: "same" };
  }

  const improved = bestIsMax ? delta > 0 : delta < 0;
  const direction = improved ? "better" : "worse";

  return { label, word: direction, direction };
}

function display(time: number | undefined) {
  return time === undefined ? "—" : time;
}

class CompareTable extends Component<{
  benches: BenchmarkInfo[];
  a: NamedRun;
  bs: NamedRun[];
  framework: string;
}> {
  @service declare router: RouterService;

  /**
   * One entry per comparison run: the run itself, its letter, and whether
   * its throttle disagrees with the baseline's.
   */
  get columns() {
    return this.args.bs.map((run, index) => ({
      run,
      letter: letterFor(index),
      throttleMismatch: throttlesDiffer(this.args.a.data, run.data),
    }));
  }

  get anyThrottleMismatch() {
    return this.columns.some((column) => column.throttleMismatch);
  }

  @cached
  get rows() {
    const percentile = percentileFrom(this.router);

    return this.args.benches.map((bench) => {
      const a = timeFor(this.args.a.data, this.args.framework, bench, percentile);
      const others = this.args.bs.map((run) => {
        const time = timeFor(run.data, this.args.framework, bench, percentile);

        return { time, comparison: compareTimes(a, time, bench.whatsBetter === "bigger") };
      });

      return { bench, a, others };
    });
  }

  @cached
  get totals() {
    // benches missing from any run would skew a summed comparison
    const complete = this.rows.filter(
      (row) => row.a !== undefined && row.others.every((other) => other.time !== undefined),
    );

    if (complete.length < 2) return;

    let a = 0;
    const sums = this.args.bs.map(() => 0);

    for (const row of complete) {
      // SAFETY: filtered above
      a += row.a as number;
      row.others.forEach((other, index) => {
        sums[index] = (sums[index] as number) + (other.time as number);
      });
    }

    const bestIsMax = this.args.benches[0]?.whatsBetter === "bigger";

    return {
      a: round(a),
      others: sums.map((sum) => ({
        time: round(sum),
        comparison: compareTimes(a, sum, bestIsMax),
      })),
    };
  }

  <template>
    <table class="compare-table">
      <thead>
        <tr>
          <th></th>
          <th class="run-header"><span class="run-tag">A</span></th>
          {{#each this.columns as |column|}}
            <th class="run-header"><span class="run-tag">{{column.letter}}</span></th>
            <th></th>
          {{/each}}
        </tr>
        <tr>
          <th></th>
          <RunHeader @run={{@a}} @framework={{@framework}} @mismatch={{this.anyThrottleMismatch}} />
          {{#each this.columns as |column|}}
            <RunHeader
              @run={{column.run}}
              @framework={{@framework}}
              @mismatch={{column.throttleMismatch}}
            />
            <th>{{column.letter}} vs A</th>
          {{/each}}
        </tr>
      </thead>
      <tbody>
        {{#each this.rows as |row|}}
          <tr>
            <BenchmarkName @bench={{row.bench}} />
            <td class="num">{{display row.a}}</td>
            {{#each row.others as |other|}}
              <td class="num">{{display other.time}}</td>
              <td class="change {{other.comparison.direction}}">
                {{#if other.comparison}}
                  <span class="value">{{other.comparison.label}}</span>
                  <span class="units">{{other.comparison.word}}</span>
                {{else}}
                  —
                {{/if}}
              </td>
            {{/each}}
          </tr>
        {{/each}}
      </tbody>

      {{#if this.totals}}
        <tfoot>
          <tr>
            <th style="text-align: right">Total</th>
            <td class="num">{{this.totals.a}}</td>
            {{#each this.totals.others as |other|}}
              <td class="num">{{other.time}}</td>
              <td class="change {{other.comparison.direction}}">
                <span class="value">{{other.comparison.label}}</span>
                <span class="units">{{other.comparison.word}}</span>
              </td>
            {{/each}}
          </tr>
        </tfoot>
      {{/if}}
    </table>
  </template>
}

export default class Compare extends Component<{ model: Model }> {
  @service declare router: RouterService;

  get a() {
    return this.args.model.a;
  }

  get bs() {
    return this.args.model.bs;
  }

  get allRuns() {
    return [this.a].concat(this.bs);
  }

  @cached
  get frameworkNames() {
    const names = new Set<string>();

    for (const run of this.allRuns) {
      for (const name of getFrameworks(run.data.results)) {
        names.add(name);
      }
    }

    // the runs list them in whatever order they were benchmarked in
    return Array.from(names).sort((a, b) => nameOf(a).localeCompare(nameOf(b)));
  }

  get framework(): string {
    const requested = this.router.currentRoute?.queryParams["framework"];

    if (typeof requested === "string" && this.frameworkNames.includes(requested)) {
      return requested;
    }

    const inAll = this.frameworkNames.find((name) =>
      this.allRuns.every((run) => run.data.results[name]),
    );

    return inAll ?? this.frameworkNames[0] ?? "";
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
   * Another column to compare against A: the newest run not already in
   * the comparison, falling back to an unused experiment, and to the
   * newest run again once everything is on screen.
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

  /**
   * Comparing runs from different machines / browsers / throttle settings
   * is comparing noise -- surface that instead of letting the numbers lie.
   */
  get environmentWarning() {
    const problems = [];

    const environment = JSON.stringify(this.a.data.environment);

    if (this.bs.some((run) => JSON.stringify(run.data.environment) !== environment)) {
      problems.push("these runs were recorded in different environments (machine / browser)");
    }

    if (this.bs.some((run) => throttlesDiffer(this.a.data, run.data))) {
      const throttles = this.allRuns.map((run) => throttleOf(run.data));

      problems.push(`the CPU was throttled differently (${throttles.join(" vs ")})`);
    }

    return problems.join("; ");
  }

  @cached
  get benchmarkInfo() {
    // ordered by the comparison runs (the newer / candidate runs), then
    // anything only in the baseline
    const byName = new Map<string, BenchmarkInfo>();

    for (const run of this.bs.concat([this.a])) {
      for (const bench of run.data.benchmarkInfo) {
        if (!byName.has(bench.name)) byName.set(bench.name, bench);
      }
    }

    return Array.from(byName.values());
  }

  @cached
  get higherBenches() {
    return higherIsBetterBenches(this.benchmarkInfo);
  }

  @cached
  get lowerBenches() {
    return lowerIsBetterBenches(this.benchmarkInfo);
  }

  /**
   * The variant any run recorded for the compared framework, preferring
   * the candidates (B onward). Runs are usually the same build, so this
   * reads "what flavor of the framework am I looking at" rather than a
   * per-run difference.
   */
  get variant() {
    for (const run of this.bs) {
      const variant = variantOf(run.data, this.framework);

      if (variant) return variant;
    }

    return variantOf(this.a.data, this.framework);
  }

  isFramework = (name: string) => this.framework === name;

  percentiles = PERCENTILES;

  labelFor = labelFor;

  isPercentile = (percentile: Percentile) => percentileFrom(this.router) === percentile;

  setPercentile = (event: Event) => {
    const { value } = event.target as HTMLSelectElement;

    this.router.transitionTo({ queryParams: { p: value } });
  };

  <template>
    {{pageTitle "Compare"}}

    <h1 class="compare-title">Compare a framework across runs</h1>

    <fieldset class="compare-controls">
      <legend>compare</legend>
      <label>
        framework
        <select name="framework" {{on "change" this.setFramework}}>
          {{#each this.frameworkNames as |name|}}
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

    {{#if this.environmentWarning}}
      <p class="compare-warning">
        ⚠️
        {{this.environmentWarning}}
        — differences below may not mean anything.
      </p>
    {{/if}}

    <div class="all-results">
      <FrameworkInfo @name={{this.framework}} />
      <Variant @variant={{this.variant}} />

      {{#if this.higherBenches.length}}
        <h2>higher is better</h2>

        <CompareTable
          @benches={{this.higherBenches}}
          @a={{this.a}}
          @bs={{this.bs}}
          @framework={{this.framework}}
        />
      {{/if}}

      {{#if this.lowerBenches.length}}
        <h2>lower is better</h2>

        <CompareTable
          @benches={{this.lowerBenches}}
          @a={{this.a}}
          @bs={{this.bs}}
          @framework={{this.framework}}
        />
      {{/if}}
    </div>
  </template>
}
