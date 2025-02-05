import Route from 'ember-route-template';
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';

function effect(fn) {
  fn();
}

function verify10k() {
  let result = document.querySelector('output').textContent;

  if (result !== '9999') {
    throw new Error('Animation frame occurred before iteration finished');
  }
}

class Test extends Component {
  @tracked value = 0;

  start = async () => {
    await 0;

    console.time('1i-10kt');
    performance.mark('1i-10kt:start');

    for (let i = 0; i < 10_000; i++) {
      this.value = i;
    }

    requestAnimationFrame(() => {
      console.timeEnd('1i-10kt');
      verify10k();
      performance.mark('1i-10kt:done');
    });
  };

  <template>
    <output>{{this.value}}</output>
    {{effect this.start}}
  </template>
}

export default Route(Test);
