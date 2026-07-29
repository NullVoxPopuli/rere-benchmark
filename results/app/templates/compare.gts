import Component from "@glimmer/component";
import { cached } from "@glimmer/tracking";
import { LinkTo } from "@ember/routing";
import { service } from "@ember/service";

import { pageTitle } from "ember-page-title";
import { runs } from "virtual:result-sets";

import { BenchmarkName } from "#components/benchmark-name.gts";
import { FrameworkInfo } from "#components/framework-info.gts";
import { Variant } from "#components/variant.gts";
import { Version } from "#components/version.gts";
import { nameOf } from "#frameworks";
import {
  getFrameworks,
  higherIsBetterBenches,
  labelFor,
  lowerIsBetterBenches,
  overrideOf,
  percentileFrom,
  PERCENTILES,
  round,
  throttleLabel,
  timeFor,
  variantOf,
  versionOf,
} from "#utils";

import type RouterService from "@ember/routing/router-service";
import type { Model, NamedRun } from "#routes/compare.ts";
import type { BenchmarkInfo, ResultSet } from "#types";
import type { Percentile } from "#utils";

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
  @service declare router: RouterService;

  @cached
  get rows() {
    const percentile = percentileFrom(this.router);

    return this.args.benches.map((bench) => {
      const a = timeFor(this.args.a.data, this.args.framework, bench, percentile);
      const b = timeFor(this.args.b.data, this.args.framework, bench, percentile);

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
            <BenchmarkName @bench={{row.bench}} />
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

  /**
   * The variant either run recorded for the compared framework, preferring
   * the candidate (B). Both runs are usually the same build, so this reads
   * "what flavor of the framework am I looking at" rather than a per-run
   * difference.
   */
  get variant() {
    return variantOf(this.b.data, this.framework) ?? variantOf(this.a.data, this.framework);
  }

  isFramework = (name: string) => this.framework === name;

  isRun = (which: "a" | "b", name: string) => this[which].name === name;

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
        <select name="run-a" {{on "change" (fn this.setRun "a")}}>
          {{#each runs as |name|}}
            <option value={{name}} selected={{this.isRun "a" name}}>{{shortName name}}</option>
          {{/each}}
        </select>
      </label>
      <label>
        run B
        <select name="run-b" {{on "change" (fn this.setRun "b")}}>
          {{#each runs as |name|}}
            <option value={{name}} selected={{this.isRun "b" name}}>{{shortName name}}</option>
          {{/each}}
        </select>
      </label>
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
      <Variant @variant={{this.variant}} />

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
