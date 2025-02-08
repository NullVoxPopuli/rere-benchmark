import EmberRouter from '@ember/routing/router';
import config from 'results/config/environment';

export default class Router extends EmberRouter {
  location = config.locationType;
  rootURL = config.rootURL;
}

Router.map(function () {
  this.route('results');
  this.route('history');
  this.route('error');
});
