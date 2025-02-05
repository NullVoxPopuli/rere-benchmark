import Route from 'ember-route-template';
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { helpers } from 'common';
import { TrackedArray } from 'tracked-built-ins';

class Test extends Component {
  items = new TrackedArray(10_000);

  start = () => helpers['10ki1u'].run((i) => (this.items[i] = i));

  <template>
    {{#each this.items as |item|}}
      {{item}}
    {{/each}}
    {{(this.start)}}
  </template>
}

export default Route(Test);
