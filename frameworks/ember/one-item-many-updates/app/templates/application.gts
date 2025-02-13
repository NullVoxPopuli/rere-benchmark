import Route from 'ember-route-template';
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { helpers } from 'common';

const test = helpers.oneItem10kUpdates();

class Test extends Component {
  @tracked value = test.getData();

  start = () => {
    test.doit((i) => (this.value = i));
  };

  <template>
    <output>{{test.formatItem this.value}}</output>
    {{(this.start)}}
  </template>
}

export default Route(Test);
