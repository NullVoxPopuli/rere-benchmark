import type { ResultSet } from '#types';
import Route from '@ember/routing/route';
import type RouterService from '@ember/routing/router-service';
import type Transition from '@ember/routing/transition';
import { service } from '@ember/service';

interface Params {
  q: string;
}

interface Model {
  data: ResultSet;
}

export default class Results extends Route<Model> {
  @service declare router: RouterService;

  queryParams = {
    q: { refreshModel: true },
  };

  beforeModel(transition: Transition) {
    const { to } = transition;
    console.log(to, to?.queryParams);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
    if (!(to as any)?.queryParams?.q) {
      console.log('ah!');
      transition.abort();
      this.router.transitionTo('error', {
        queryParams: {
          error: `Missing 'q' param when trying to visit the 'results' route.`,
        },
      });
    }
  }

  async model(params: Record<string, string>): Promise<Model> {
    // SAFETY: verified in beforeModel
    const { q } = params as unknown as Params;

    const response = await fetch(`/results/${q}.json`);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const json = await response.json();

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    return { data: json };
  }
}
