import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";

import { helpers } from "common";

const test = helpers.tenKitems1UpdateEach();

export default class Test extends Component {
  @tracked items = test.getData();

  start = () => {
    test.doit((i) => {
      this.items[i] = i;

      // signal to the @tracked property that the array's contents changed
      // eslint-disable-next-line no-self-assign
      this.items = this.items;
    });
  };

  // key="@index": position-keyed, like react's key={index}, vue and
  // svelte's positional defaults, and angular's track $index. The default
  // (@identity) keys by value, and this bench's values change on every
  // update -- so every update tore its row down and built a new one
  // (10k adds + 10k removes per flush) instead of writing the text in
  // place. 3.4x on this bench.
  //
  // No spaces, like all the other frameworks (especially JSX)
  // Adding invisible characters is so annoying in JSX haha
  //
  // Ember should probably have a way to strip the unmeaning spaces anyway
  // I think the algo is easy
  // prettier-ignore
  <template>{{#each this.items key="@index" as |item|}}{{test.formatItem item}}{{/each}}{{(this.start)}}</template>
}
