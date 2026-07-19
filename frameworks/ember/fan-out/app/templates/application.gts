import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';

import { helpers } from 'common';

const test = helpers.fanOut();

export default class Test extends Component {
  @tracked value = test.getData();

  // Idiomatic derived state: formatItem still runs once per consumer
  // per render, but without per-consumer helper-invocation machinery.
  get formatted() {
    return test.formatItem(this.value);
  }

  start = () => {
    test.doit((v: number) => (this.value = v));
  };

  // No spaces, like all the other frameworks (especially JSX)
  // prettier-ignore
  <template><output>{{#each test.consumerRange as |_c|}}<span>{{this.formatted}}</span>{{/each}}</output>{{(this.start)}}</template>
}
