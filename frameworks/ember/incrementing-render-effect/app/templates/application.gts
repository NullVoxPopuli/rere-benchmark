import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { helpers } from "common";
import { modifier } from "ember-modifier";

const test = helpers.incrementingRenderEffect();

export default class Test extends Component {
  @tracked out = 0;

  #advancer: (() => void) | undefined;
  setup = modifier((element) => {
    if (this.#advancer) {
      this.#advancer();
      return;
    }

    test.doit({
      element,
      get: () => this.out,
      set: (value: number) => (this.out = value),
      setupAdvancer: (advancer: () => void) => (this.#advancer = advancer),
    });
  });

  <template>
    <output {{this.setup}}>{{this.out}}</output>
  </template>
}
