import Component from "@glimmer/component";
import { cached, tracked } from "@glimmer/tracking";
import { warn } from "@ember/debug";
import { get } from "@ember/helper";

import { interpolate } from "culori";

import { FrameworkInfo } from "#components/framework-info.gts";
import { round, timeFromMarks } from "#utils";

import type Owner from "@ember/owner";
import type { Model } from "#routes/results.ts";
import type { BenchmarkInfo, ResultSet } from "#types";

const start = "#ff7777";
const end = "#77ff77";

function colorFor(
  speed: number | undefined,
  min: number | undefined,
  max: number | undefined,
  reverse = false,
) {
  if (!speed || !min || !max) return;

  const interpolation = interpolate(reverse ? [start, end] : [end, start], "oklch");

  const normalized = (speed - min) / (max - min);
  const color = interpolation(normalized);

  return `oklch(${color.l} ${color.c} ${color.h}deg)`;
}

/**
 * The same normalization the cell colors use, as a displayable value.
 */
function scoreFor(speed: number | undefined, min: number | undefined, max: number | undefined) {
  if (speed === undefined || min === undefined || max === undefined) return;
  if (max === min) return (1).toFixed(2);

  return ((speed - min) / (max - min)).toFixed(2);
}

class TableRow extends Component<{
  file: ResultSet;
  benchInfo: BenchmarkInfo;
  frameworkNames: string[];
  showScores: boolean;
}> {
  declare speeds: Record<string, number | undefined>;
  declare colors: Record<string, string | undefined>;
  max = -Infinity;
  min = Infinity;

  constructor(
    owner: Owner,
    args: {
      file: ResultSet;
      benchInfo: BenchmarkInfo;
      frameworkNames: string[];
      showScores: boolean;
    },
  ) {
    super(owner, args);

    this.speeds = {};
    this.colors = {};

    for (const framework of args.frameworkNames) {
      const test = args.file.results[framework]?.[args.benchInfo.name];

      if (!test) continue;

      const time = timeFromMarks(test.times, this.args.benchInfo.measure);

      this.speeds[framework] = time;

      if (time > this.max) this.max = time;
      if (time < this.min) this.min = time;
    }

    for (const framework of args.frameworkNames) {
      const time = this.speeds[framework];

      this.colors[framework] = colorFor(
        time,
        this.min,
        this.max,
        args.benchInfo.whatsBetter === "bigger",
      );
    }
  }

  score = (framework: string) => {
    return scoreFor(this.speeds[framework], this.min, this.max);
  };

  <template>
    <tr>
      <td class="benchmark-name">
        {{@benchInfo.name}}
        <span class="units">
          (
          {{@benchInfo.units}}
          )
        </span>
      </td>

      {{#each @frameworkNames as |framework|}}
        <td style="background: {{get this.colors framework}};"><span class="value">{{#if
              @showScores
            }}{{this.score framework}}{{else}}{{get this.speeds framework}}{{/if}}</span></td>
      {{/each}}
    </tr>
  </template>
}

class Table extends Component<{
  benches: BenchmarkInfo[];
  file: ResultSet;
  showScores: boolean;
}> {
  shouldShowTotals = false;
  totals: Record<string, number> = {};

  constructor(
    owner: Owner,
    args: {
      benches: BenchmarkInfo[];
      file: ResultSet;
      showScores: boolean;
    },
  ) {
    super(owner, args);

    this.shouldShowTotals = this.args.benches.length > 1;

    if (this.shouldShowTotals) {
      for (const bench of args.benches) {
        for (const framework of args.file.selections.frameworks) {
          this.totals[framework] ??= 0;

          const test = args.file.results[framework]?.[bench.name];

          if (!test) continue;

          const time = timeFromMarks(test.times, bench.measure);

          this.totals[framework] += time;
        }
      }

      let max = -Infinity;
      let min = Infinity;

      for (const [key, value] of Object.entries(this.totals)) {
        this.totals[key] = round(value);

        if (value > max) max = value;
        if (value < min) min = value;
      }

      this.totals.max = max;
      this.totals.min = min;
    }
  }

  get frameworkNames() {
    return this.args.file.selections.frameworks;
  }

  totalScore = (framework: string) => {
    return scoreFor(this.totals[framework], this.totals.min, this.totals.max);
  };

  versionFor = (framework: string) => {
    /**
     * Because each bench mark is a different app, it is possible the versions diverge
     */
    const versions = Object.values(this.args.file.results[framework] ?? {}).map(
      (result) => result.version,
    );

    const versionSet = new Set(versions);

    warn(
      `There is more than one version for ${framework}. You need to do some upgrading to get the benchmark apps for ${framework} in sync. Found ${[...versionSet].join(", ")}`,
      versionSet.size > 1,
      {
        id: "benchmark-app-maintenance-needed-version-divergence",
      },
    );

    return [...versionSet][0];
  };

  <template>
    <table>
      <thead>
        <tr>
          <th></th>
          {{#each this.frameworkNames as |framework|}}
            <th class="fw-header">
              <FrameworkInfo @name={{framework}} />
              <span class="small">
                {{this.versionFor framework}}
              </span>
            </th>
          {{/each}}
        </tr>
      </thead>
      <tbody>
        {{#each @benches as |bench|}}
          <TableRow
            @file={{@file}}
            @benchInfo={{bench}}
            @frameworkNames={{this.frameworkNames}}
            @showScores={{@showScores}}
          />
        {{/each}}
      </tbody>

      {{#if this.shouldShowTotals}}
        <tfoot>
          <tr><th style="text-align: right">Total</th>
            {{#each this.frameworkNames as |framework|}}
              <td
                style="background: {{colorFor
                  (get this.totals framework)
                  this.totals.min
                  this.totals.max
                }}"
              >
                <span class="value">{{#if @showScores}}{{this.totalScore framework}}{{else}}{{get
                      this.totals
                      framework
                    }}{{/if}}</span>
              </td>
            {{/each}}
          </tr>
        </tfoot>
      {{/if}}
    </table>
  </template>
}

export default class ResultsTables extends Component<{
  model: Model;
}> {
  @tracked showScores = false;

  showRawValues = () => (this.showScores = false);
  showScoreValues = () => (this.showScores = true);

  get file() {
    return this.args.model.data;
  }

  get benchmarkInfo() {
    return this.args.model.data.benchmarkInfo;
  }

  @cached
  get higherBenches() {
    return this.benchmarkInfo.filter((bench) => bench.whatsBetter === "bigger");
  }

  @cached
  get lowerBenches() {
    return this.benchmarkInfo
      .filter((bench) => bench.whatsBetter !== "bigger")
      .toSorted()
      .toSorted((a, b) => (a.name.includes("async") ? 1 : 0) - (b.name.includes("async") ? 1 : 0));
  }

  <template>
    <fieldset class="value-mode">
      <legend>values</legend>
      <label>
        <input
          type="radio"
          name="value-mode"
          checked={{unless this.showScores true}}
          {{on "change" this.showRawValues}}
        />
        raw
      </label>
      <label>
        <input
          type="radio"
          name="value-mode"
          checked={{this.showScores}}
          {{on "change" this.showScoreValues}}
        />
        score
        <span class="units">(normalized 0 to 1)</span>
      </label>
    </fieldset>

    {{#if this.higherBenches.length}}
      <h2>higher is better</h2>

      <Table @benches={{this.higherBenches}} @file={{this.file}} @showScores={{this.showScores}} />
      <br />
      <br />
      <br />
    {{/if}}

    {{#if this.lowerBenches.length}}
      <h2>lower is better</h2>

      <Table @benches={{this.lowerBenches}} @file={{this.file}} @showScores={{this.showScores}} />
      <br />
      <br />
      <br />
    {{/if}}
  </template>
}
