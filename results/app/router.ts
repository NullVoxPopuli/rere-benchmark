import EmberRouter from '@ember/routing/router';
import config from '#config';

export default class Router extends EmberRouter {
  location = config.locationType;
  rootURL = config.rootURL;
}

Router.map(function () {
  this.route('results', function () {
    this.route('boxplot');
    this.route('animated');
  });
  this.route('history');
  this.route('error');
});
