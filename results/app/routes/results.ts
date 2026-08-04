import Route from "@ember/routing/route";
import { service } from "@ember/service";

import { ResultSet } from "#result-set";

import type RouterService from "@ember/routing/router-service";
import type Transition from "@ember/routing/transition";

interface Params {
  q: string;
  from?: string;
}

export interface Model {
  data: ResultSet;
  borrowed?: ResultSet;
}

export default class Results extends Route<Model> {
  @service declare router: RouterService;

  queryParams = {
    q: { refreshModel: true },
    from: { refreshModel: true },
    // which of the borrowed set's frameworks; the set is already loaded,
    // so no model impact
    col: {},
    hide: {},
    // order frameworks by their per-area totals (best | worst); no model impact
    sort: {},
    // display mode for the tables page (raw | linear | log); no model impact
    mode: {},
    // which percentile of each run's samples to show (50 | 75 | 90);
    // every sample is already loaded, so no model impact
    p: {},
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

    try {
      const [data, borrowed] = await Promise.all([
        ResultSet.fetch(q),
        from ? ResultSet.fetch(from) : undefined,
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
