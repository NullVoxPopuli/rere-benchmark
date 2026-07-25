import Component from "@glimmer/component";
import { cached } from "@glimmer/tracking";
import { LinkTo } from "@ember/routing";
import { service } from "@ember/service";

import { pageTitle } from "ember-page-title";
import { results } from "virtual:result-sets";

import { FrameworkInfo } from "#components/framework-info.gts";
import { Version } from "#components/version.gts";
import { frameworks } from "#frameworks";
import {
  getFrameworks,
  getFrameworkVersion,
  higherIsBetterBenches,
  lowerIsBetterBenches,
  round,
  timeFromMarks,
} from "#utils";

import type RouterService from "@ember/routing/router-service";
import type { Model, NamedRun } from "#routes/compare.ts";
import type { BenchmarkInfo, ResultSet } from "#types";

/**
 * Below this |% change|, runs are considered equivalent -- individual
 * runs are noisy, so a fraction of a percent either way is meaningless.
 */
const SAME_THRESHOLD = 1;

function shortName(runName: string) {
  return runName.slice(0, 16).replace("T", " ");
}

function qp(runName: string) {
  return { q: runName };
}

function nameOf(framework: string) {
  return frameworks[framework]?.name ?? framework;
}

function versionOf(file: ResultSet, framework: string) {
  return getFrameworkVersion(file.results, framework);
}

function overrideOf(file: ResultSet, framework: string) {
  return file.versionOverrides?.[framework];
}

/**
 * How much the CPU was slowed down for a run. Timings are only
 * comparable at the same setting, so both runs say theirs outright
 * rather than leaving it to be inferred. A run from before the setting
 * was recorded is not the same as a run that wasn't throttled.
 */
function throttleOf(file: ResultSet) {
  const throttle = file.args?.CPU_THROTTLE;

  if (throttle === undefined) return "CPU throttle unrecorded";

  return throttle > 1 ? `${throttle}x CPU slowdown` : "no CPU slowdown";
}

function throttlesDiffer(a: ResultSet, b: ResultSet) {
  return (a.args?.CPU_THROTTLE ?? null) !== (b.args?.CPU_THROTTLE ?? null);
}

function timeFor(file: ResultSet, framework: string, bench: BenchmarkInfo) {
  const test = file.results[framework]?.[bench.name];

  if (!test) return;

  return timeFromMarks(test.times, bench.measure);
}

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
  b: NamedRun;
  framework: string;
}> {
  @cached
  get rows() {
    return this.args.benches.map((bench) => {
      const a = timeFor(this.args.a.data, this.args.framework, bench);
      const b = timeFor(this.args.b.data, this.args.framework, bench);

      return {
        bench,
        a,
        b,
        comparison: compareTimes(a, b, bench.whatsBetter === "bigger"),
      };
    });
  }

  get throttlesDiffer() {
    return throttlesDiffer(this.args.a.data, this.args.b.data);
  }

  @cached
  get totals() {
    // benches missing from either run would skew a summed comparison
    const complete = this.rows.filter((row) => row.a !== undefined && row.b !== undefined);

    if (complete.length < 2) return;

    let a = 0;
    let b = 0;

    for (const row of complete) {
      // SAFETY: filtered above
      a += row.a as number;
      b += row.b as number;
    }

    return {
      a: round(a),
      b: round(b),
      comparison: compareTimes(a, b, this.args.benches[0]?.whatsBetter === "bigger"),
    };
  }

  <template>
    <table class="compare-table">
      <thead>
        <tr>
          <th></th>
          <th class="run-header">
            <span class="run-tag">A</span>
            <LinkTo @route="results" @query={{qp @a.name}}>{{shortName @a.name}}</LinkTo>
            <span class="small">
              <Version
                @version={{versionOf @a.data @framework}}
                @override={{overrideOf @a.data @framework}}
              />
            </span>
            <span class="small throttle {{if this.throttlesDiffer 'mismatch'}}">
              {{throttleOf @a.data}}
            </span>
          </th>
          <th class="run-header">
            <span class="run-tag">B</span>
            <LinkTo @route="results" @query={{qp @b.name}}>{{shortName @b.name}}</LinkTo>
            <span class="small">
              <Version
                @version={{versionOf @b.data @framework}}
                @override={{overrideOf @b.data @framework}}
              />
            </span>
            <span class="small throttle {{if this.throttlesDiffer 'mismatch'}}">
              {{throttleOf @b.data}}
            </span>
          </th>
          <th>B vs A</th>
        </tr>
      </thead>
      <tbody>
        {{#each this.rows as |row|}}
          <tr>
            <td class="benchmark-name">
              {{row.bench.name}}
              <span class="units">
                (
                {{row.bench.units}}
                )
              </span>
            </td>
            <td class="num">{{display row.a}}</td>
            <td class="num">{{display row.b}}</td>
            <td class="change {{row.comparison.direction}}">
              {{#if row.comparison}}
                <span class="value">{{row.comparison.label}}</span>
                <span class="units">{{row.comparison.word}}</span>
              {{else}}
                —
              {{/if}}
            </td>
          </tr>
        {{/each}}
      </tbody>

      {{#if this.totals}}
        <tfoot>
          <tr>
            <th style="text-align: right">Total</th>
            <td class="num">{{this.totals.a}}</td>
            <td class="num">{{this.totals.b}}</td>
            <td class="change {{this.totals.comparison.direction}}">
              <span class="value">{{this.totals.comparison.label}}</span>
              <span class="units">{{this.totals.comparison.word}}</span>
            </td>
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

  get b() {
    return this.args.model.b;
  }

  @cached
  get frameworkNames() {
    const names = new Set(
      getFrameworks(this.a.data.results).concat(getFrameworks(this.b.data.results)),
    );

    // the runs list them in whatever order they were benchmarked in
    return Array.from(names).sort((a, b) => nameOf(a).localeCompare(nameOf(b)));
  }

  get framework(): string {
    const requested = this.router.currentRoute?.queryParams["framework"];

    if (typeof requested === "string" && this.frameworkNames.includes(requested)) {
      return requested;
    }

    const inBoth = this.frameworkNames.find(
      (name) => this.a.data.results[name] && this.b.data.results[name],
    );

    return inBoth ?? this.frameworkNames[0] ?? "";
  }

  setFramework = (event: Event) => {
    const { value } = event.target as HTMLSelectElement;

    this.router.transitionTo({ queryParams: { framework: value } });
  };

  setRun = (which: "a" | "b", event: Event) => {
    const { value } = event.target as HTMLSelectElement;

    this.router.transitionTo({ queryParams: { [which]: value } });
  };

  swap = () => {
    this.router.transitionTo({
      queryParams: { a: this.b.name, b: this.a.name },
    });
  };

  /**
   * Comparing runs from different machines / browsers / throttle settings
   * is comparing noise -- surface that instead of letting the numbers lie.
   */
  get environmentWarning() {
    const problems = [];

    if (JSON.stringify(this.a.data.environment) !== JSON.stringify(this.b.data.environment)) {
      problems.push("these runs were recorded in different environments (machine / browser)");
    }

    if (throttlesDiffer(this.a.data, this.b.data)) {
      problems.push(
        `the CPU was throttled differently (${throttleOf(this.a.data)} vs ${throttleOf(this.b.data)})`,
      );
    }

    return problems.join("; ");
  }

  @cached
  get benchmarkInfo() {
    // ordered by run B (the newer / candidate run), then anything only in A
    const byName = new Map<string, BenchmarkInfo>();

    for (const bench of this.b.data.benchmarkInfo.concat(this.a.data.benchmarkInfo)) {
      if (!byName.has(bench.name)) byName.set(bench.name, bench);
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

  isFramework = (name: string) => this.framework === name;

  isRun = (which: "a" | "b", name: string) => this[which].name === name;

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
        <select name="run-a" {{on "change" (fn this.setRun "a")}}>
          {{#each results as |name|}}
            <option value={{name}} selected={{this.isRun "a" name}}>{{shortName name}}</option>
          {{/each}}
        </select>
      </label>
      <label>
        run B
        <select name="run-b" {{on "change" (fn this.setRun "b")}}>
          {{#each results as |name|}}
            <option value={{name}} selected={{this.isRun "b" name}}>{{shortName name}}</option>
          {{/each}}
        </select>
      </label>
      <button type="button" {{on "click" this.swap}}>swap A ⇄ B</button>
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

      {{#if this.higherBenches.length}}
        <h2>higher is better</h2>

        <CompareTable
          @benches={{this.higherBenches}}
          @a={{this.a}}
          @b={{this.b}}
          @framework={{this.framework}}
        />
      {{/if}}

      {{#if this.lowerBenches.length}}
        <h2>lower is better</h2>

        <CompareTable
          @benches={{this.lowerBenches}}
          @a={{this.a}}
          @b={{this.b}}
          @framework={{this.framework}}
        />
      {{/if}}
    </div>
  </template>
}
