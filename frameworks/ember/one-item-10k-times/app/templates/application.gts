import Route from 'ember-route-template';
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { helpers } from 'common';

class Test extends Component {
  @tracked value = 0;

  start = () => helpers['1i10ku'].run((i) => (this.value = i));

  <template>
    <output>{{this.value}}</output>
    {{(this.start)}}
  </template>
}

export default Route(Test);
