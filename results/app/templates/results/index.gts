import Component from '@glimmer/component';
import { FrameworkInfo } from '#components/framework-info.gts';
import type { Model } from '#routes/results.ts';
import type { BenchmarkInfo, ResultSet } from '#types';
import { timeFromMarks } from '#utils';
import { interpolate } from 'culori';
import { cached } from '@glimmer/tracking';
import { warn } from '@ember/debug';
import type Owner from '@ember/owner';
import { get } from '@ember/helper';

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

class TableRow extends Component<{
  file: ResultSet;
  benchInfo: BenchmarkInfo;
  frameworkNames: string[];
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
    }
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
        args.benchInfo.whatsBetter === 'bigger'
      );
    }
  }

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
        <td style="background: {{get this.colors framework}};"><span
            class="value"
          >{{get this.speeds framework}}</span></td>
      {{/each}}
    </tr>
  </template>
}

class Table extends Component<{
  benches: BenchmarkInfo[];
  file: ResultSet;
}> {
  get frameworkNames() {
    return this.args.file.selections.frameworks;
  }

  get shouldShowTotals() {
    return this.args.benches.length > 1;
  }

  versionFor = (framework: string) => {
    /**
     * Because each bench mark is a different app, it is possible the versions diverge
     */
    const versions = Object.values(this.args.file.results[framework] ?? {}).map(
      (result) => result.version
    );

    const versionSet = new Set(versions);

    warn(
      `There is more than one version for ${framework}. You need to do some upgrading to get the benchmark apps for ${framework} in sync. Found ${[...versionSet].join(', ')}`,
      versionSet.size > 1,
      {
        id: 'benchmark-app-maintenance-needed-version-divergence',
      }
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
          />
        {{/each}}
      </tbody>
    </table>
  </template>
}

export default class ResultsTables extends Component<{
  model: Model;
}> {
  get file() {
    return this.args.model.data;
  }

  get benchmarkInfo() {
    return this.args.model.data.benchmarkInfo;
  }

  @cached
  get higherBenches() {
    return this.benchmarkInfo.filter((bench) => bench.whatsBetter === 'bigger');
  }

  @cached
  get lowerBenches() {
    return this.benchmarkInfo
      .filter((bench) => bench.whatsBetter !== 'bigger')
      .toSorted()
      .toSorted(
        (a, b) =>
          (a.name.includes('async') ? 1 : 0) -
          (b.name.includes('async') ? 1 : 0)
      );
  }

  <template>
    {{#if this.higherBenches.length}}
      <h2>higher is better</h2>

      <Table @benches={{this.higherBenches}} @file={{this.file}} />
      <br />
      <br />
      <br />
    {{/if}}

    {{#if this.lowerBenches.length}}
      <h2>lower is better</h2>

      <Table @benches={{this.lowerBenches}} @file={{this.file}} />
      <br />
      <br />
      <br />
    {{/if}}
  </template>
}
