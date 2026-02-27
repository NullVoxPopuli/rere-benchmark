import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';

import { helpers } from 'common';

const test = helpers.tenKitems1UpdateEach();

export default class Test extends Component {
  @tracked items = test.getData();

  start = () => {
    test.doit((i) => {
      this.items[i] = i;

      this.items = this.items;
    });
  };

  // No spaces, like all the other frameworks (especially JSX)
  // Adding invisible characters is so annoying in JSX haha
  //
  // Ember should probably have a way to strip the unmeaning spaces anyway
  // I think the algo is easy
  // prettier-ignore
  <template>{{#each this.items as |item|}}{{test.formatItem item}}{{/each}}{{(this.start)}}</template>
}
