import Route from 'ember-route-template';
import Component from '@glimmer/component';
import { helpers } from 'common';
import { TrackedArray } from 'tracked-built-ins';

const test = helpers.tenKitems1UpdateEach();

class Test extends Component {
  items = new TrackedArray(test.getData());

  start = () => {
    test.run((i) => (this.items[i] = i));
  };

  // No spaces, like all the other frameworks (especially JSX)
  // Adding invisible characters is so annoying in JSX haha
  //
  // Ember should probably have a way to strip the unmeaning spaces anyway
  // I think the algo is easy
  // prettier-ignore
  <template>{{#each this.items as |item|}}{{test.formatItem item}}{{/each}}{{(this.start)}}</template>
}

export default Route(Test);
