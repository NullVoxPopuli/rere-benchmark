import type { ResultSet } from '#types';
import Route from '@ember/routing/route';
import type RouterService from '@ember/routing/router-service';
import type Transition from '@ember/routing/transition';
import { service } from '@ember/service';

interface Params {
  q: string;
}

export interface Model {
  data: ResultSet;
}

export default class Results extends Route<Model> {
  @service declare router: RouterService;

  queryParams = {
    q: { refreshModel: true },
  };

  beforeModel(transition: Transition) {
    const { to } = transition;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
    if (!(to as any)?.queryParams?.q) {
      transition.abort();
      this.router.transitionTo('error', {
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
    const { q } = params as unknown as Params;

    try {
      const response = await fetch(`/results/${q}.json`);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const json = await response.json();

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      return { data: json };
    } catch (e) {
      console.error(e);
      // SAFETY: don't care -- the fact that people can throw non-errors is a mistake
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      this.router.transitionTo('error', { queryParams: { error: e.message } });
    }
  }
}
