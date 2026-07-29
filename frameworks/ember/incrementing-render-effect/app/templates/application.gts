import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";

import { helpers } from "common";
import { modifier } from "ember-modifier";

const test = helpers.incrementingRenderEffect();

export default class Test extends Component {
  // -1 so the initial set(0) is not swallowed by equality, same as the
  // other frameworks. tracked() as a value has Object.is equality,
  // unlike the @tracked decorator, which dirties on every write.
  out = tracked(-1);

  #advancer: (() => void) | undefined;
  setup = modifier((element) => {
    if (this.#advancer) {
      this.#advancer();

      return;
    }

    test.doit({
      element,
      get: () => this.out.value,
      set: (value: number) => (this.out.value = value),
      setupAdvancer: (advancer: () => void) => (this.#advancer = advancer),
    });
  });

  <template>
    <output {{this.setup}}>{{this.out.value}}</output>
  </template>
}
