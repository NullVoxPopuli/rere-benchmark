import Route from '@ember/routing/route';

export default class Index extends Route {
  queryParams = {
    error: { refreshModel: false },
  };
}
