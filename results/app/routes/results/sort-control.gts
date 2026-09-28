import Component from "@glimmer/component";
import { service } from "@ember/service";

import { DEFAULT_SORT, totalSortFrom } from "#utils";

import type RouterService from "@ember/routing/router-service";
import type QueryParams from "#services/query-params.ts";
import type { TotalSort } from "#utils";

export class SortControl extends Component {
  @service declare router: RouterService;
  @service declare queryParams: QueryParams;

  isSort = (sort: TotalSort) => totalSortFrom(this.queryParams) === sort;

  setSort = (sort: TotalSort) => {
    // the default stays out of the URL
    this.router.transitionTo({ queryParams: { sort: sort === DEFAULT_SORT ? null : sort } });
  };

  <template>
    <fieldset class="value-mode surface">
      <legend>sort</legend>
      <label>
        <input
          type="radio"
          name="total-sort"
          checked={{this.isSort "best"}}
          {{on "change" (fn this.setSort "best")}}
        />
        best total first
      </label>
      <label>
        <input
          type="radio"
          name="total-sort"
          checked={{this.isSort "worst"}}
          {{on "change" (fn this.setSort "worst")}}
        />
        worst total first
      </label>
      <label>
        <input
          type="radio"
          name="total-sort"
          checked={{this.isSort "alphabetical"}}
          {{on "change" (fn this.setSort "alphabetical")}}
        />
        alphabetical
      </label>
      <span class="units">within each result area</span>
    </fieldset>
  </template>
}
