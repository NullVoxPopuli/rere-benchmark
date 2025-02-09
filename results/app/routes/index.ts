import { service } from '@ember/service';
import { results } from 'virtual:result-sets';
import Route from '@ember/routing/route';
import type RouterService from '@ember/routing/router-service';

export default class Index extends Route {
  @service declare router: RouterService;

  beforeModel() {
    this.router.transitionTo('results', {
      queryParams: {
        q: results[0],
      },
    });
  }
}
