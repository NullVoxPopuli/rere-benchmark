import Route from 'ember-route-template';
import Component from '@glimmer/component';
import { helpers } from 'common';
import { TrackedArray } from 'tracked-built-ins';

class Test extends Component {
  items = new TrackedArray(Array(10_000).fill(0));

  start = () => helpers['10ki1u-25p'].run((i) => (this.items[i] = i));

  <template>
    {{#each this.items as |item|}}
      {{item}}
    {{/each}}
    {{(this.start)}}
  </template>
}

export default Route(Test);
