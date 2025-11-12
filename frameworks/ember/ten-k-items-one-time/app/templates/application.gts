import Component from '@glimmer/component';
import { trackedArray } from '@ember/reactive/collections';

import { helpers } from 'common';

const test = helpers.tenKitems1UpdateEach();

export default class Test extends Component {
  items = trackedArray(test.getData(), { equals: () => false });

  start = () => {
    test.doit((i) => (this.items[i] = i));
  };

  // No spaces, like all the other frameworks (especially JSX)
  // Adding invisible characters is so annoying in JSX haha
  //
  // Ember should probably have a way to strip the unmeaning spaces anyway
  // I think the algo is easy
  // prettier-ignore
  <template>{{#each this.items as |item|}}{{test.formatItem item}}{{/each}}{{(this.start)}}</template>
}
