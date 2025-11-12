import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';

import { helpers } from 'common';

const test = helpers.oneItem10kUpdates();

export default class Test extends Component {
  @tracked value = test.getData();

  start = () => {
    test.doit((i) => (this.value = i));
  };

  <template>
    <output>{{test.formatItem this.value}}</output>
    {{(this.start)}}
  </template>
}
