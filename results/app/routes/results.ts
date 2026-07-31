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
  borrowed?: Borrowed;
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
      const [data, borrowedData] = await Promise.all([
        fetchResultSet(q),
        from ? fetchResultSet(from) : undefined,
      ]);

      return {
        data,
        borrowed: from && borrowedData ? { name: from, data: borrowedData } : undefined,
      };
    } catch (e) {
      console.error(e);
      // SAFETY: don't care -- the fact that people can throw non-errors is a mistake
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      this.router.transitionTo("error", { queryParams: { error: e.message } });
    }
  }
}
