import { service } from '@ember/service';
import { results } from '../templates/history.gts';
import Route from '@ember/routing/route';
import type RouterService from '@ember/routing/router-service';

export default class Index extends Route {
  @service declare router: RouterService;

  beforeModel() {
    this.router.transitionTo('results', {
      queryParams: {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        q: results[0],
      },
    });
  }
}
