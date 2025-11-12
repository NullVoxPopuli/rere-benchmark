import Application from '@ember/application';
import Resolver from 'ember-resolver';
import config from './config.ts';
import Router from './router.ts';
import Entrypoint from './templates/application.gts';

export default class App extends Application {
  modulePrefix = config.modulePrefix;
  Resolver = Resolver.withModules({
    'my-app/router': { default: Router },
    'my-app/templates/application': { default: Entrypoint },
  });
}
