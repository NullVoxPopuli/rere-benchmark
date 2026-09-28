import Component from "@glimmer/component";
import { service } from "@ember/service";

import { splitOptionsOf } from "#utils";

import type RouterService from "@ember/routing/router-service";
import type QueryParams from "#services/query-params.ts";
import type { BenchmarkInfo } from "#types";

export function splitsFrom(qp: QueryParams) {
  const split = qp.get("split");

  return split ? split.split(",") : [];
}

export class TableSplits extends Component<{
  benchmarkInfo: BenchmarkInfo[];
}> {
  @service declare router: RouterService;
  @service declare queryParams: QueryParams;

  get options() {
    return splitOptionsOf(this.args.benchmarkInfo);
  }

  isSplit = (token: string) => splitsFrom(this.queryParams).includes(token);

  toggle = (token: string, event: Event) => {
    const { checked } = event.target as HTMLInputElement;
    const splits = splitsFrom(this.queryParams).filter((entry) => entry !== token);

    if (checked) splits.push(token);

    this.router.transitionTo({ queryParams: { split: splits.join(",") || null } });
  };

  <template>
    <fieldset class="value-mode surface">
      <legend>split tables</legend>
      {{#each this.options as |token|}}
        <label>
          <input
            type="checkbox"
            name="split-{{token}}"
            checked={{this.isSplit token}}
            {{on "change" (fn this.toggle token)}}
          />
          {{token}}
        </label>
      {{/each}}
      <span class="units">checked benchmarks move to their own table</span>
    </fieldset>
  </template>
}
