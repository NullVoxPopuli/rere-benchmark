import Component from "@glimmer/component";
import { service } from "@ember/service";

import { labelFor, percentileFrom, PERCENTILES } from "#utils";

import type RouterService from "@ember/routing/router-service";
import type QueryParams from "#services/query-params.ts";
import type { Percentile } from "#utils";

export class PercentileControl extends Component {
  @service declare router: RouterService;
  @service declare queryParams: QueryParams;

  percentiles = PERCENTILES;

  isPercentile = (percentile: Percentile) => percentileFrom(this.queryParams) === percentile;

  setPercentile = (percentile: Percentile) => {
    this.router.transitionTo({ queryParams: { p: percentile } });
  };

  labelFor = labelFor;

  <template>
    <fieldset class="value-mode surface">
      <legend>statistic</legend>
      {{#each this.percentiles as |percentile|}}
        <label>
          <input
            type="radio"
            name="percentile"
            checked={{this.isPercentile percentile}}
            {{on "change" (fn this.setPercentile percentile)}}
          />
          {{this.labelFor percentile}}
        </label>
      {{/each}}
      {{! percentiles run toward the worse end either way, so the same
        number means the same thing on both tables }}
      <span class="units">of each run's samples</span>
    </fieldset>
  </template>
}
