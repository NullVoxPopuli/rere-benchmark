import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { helpers } from "common";

const test = helpers.incrementingRenderEffect();

export default class Test extends Component {
  @tracked output = 0;

  #advancer: (() => void) | undefined;
  advance = () => {
    if (this.#advancer) {
      this.#advancer();
      return;
    }

    test.doit({
      get: () => this.output,
      set: (value: number) => (this.output = value),
      setupAdvancer: (advancer: () => void) => (this.#advancer = advancer),
    });
  };

  <template>
    <output>{{this.output}}</output>{{(this.advance)}}
  </template>
}
