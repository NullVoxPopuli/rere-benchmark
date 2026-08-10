import Route from "@ember/routing/route";
import { service } from "@ember/service";

import { fetchResultSet } from "#utils";

import type RouterService from "@ember/routing/router-service";
import type Transition from "@ember/routing/transition";
import type { ResultSet } from "#types";

interface Params {
  q: string;
  from?: string;
}

export interface Borrowed {
  name: string;
  data: ResultSet;
}

export interface Model {
  data: ResultSet;
  /** every run with a column on loan, in the order `?from=` lists them */
  borrowed: Borrowed[];
}

export default class Results extends Route<Model> {
  @service declare router: RouterService;

  queryParams = {
    q: { refreshModel: true },
    // comma-separated: one run per borrowed column
    from: { refreshModel: true },
    // comma-separated, positional against `from`: which framework to take
    // from each. Those sets are already loaded, so no model impact.
    col: {},
    hide: {},
    // order frameworks by their per-area totals (best | worst); no model impact
    sort: {},
    // display mode for the tables page (raw | linear | log); no model impact
    mode: {},
    // how hard the heatmap ramp bends toward each row's best value;
    // purely a color choice, so no model impact
    curve: {},
    // which percentile of each run's samples to show (50 | 75 | 90);
    // every sample is already loaded, so no model impact
    p: {},
    // comma-separated: which bench groups get their own milliseconds
    // table; purely layout, so no model impact
    split: {},
  };

  beforeModel(transition: Transition) {
    const { to } = transition;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
    if (!(to as any)?.queryParams?.q) {
      transition.abort();
      this.router.transitionTo("error", {
        queryParams: {
          error: `Missing 'q' param when trying to visit the 'results' route.`,
        },
      });
    }
  }

  // SAFETY: see note about JS Language mishap
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  async model(params: Record<string, string>): Promise<Model> {
    // SAFETY: verified in beforeModel
    const { q, from } = params as unknown as Params;

    // duplicates would collide as columns and there is nothing to gain from
    // borrowing the same run twice
    const names = Array.from(new Set(from ? from.split(",").filter(Boolean) : []));

    try {
      // paired inside the fetch, so nothing has to line two arrays back up
      const [data, borrowed] = await Promise.all([
        fetchResultSet(q),
        Promise.all(names.map(async (name) => ({ name, data: await fetchResultSet(name) }))),
      ]);

      return { data, borrowed };
    } catch (e) {
      console.error(e);
      // SAFETY: don't care -- the fact that people can throw non-errors is a mistake
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      this.router.transitionTo("error", { queryParams: { error: e.message } });
    }
  }
}
