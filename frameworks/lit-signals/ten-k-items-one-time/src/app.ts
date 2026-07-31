import { helpers } from 'common';
import { html, LitElement } from 'lit';
import { computed, signal, SignalWatcher, watch } from '@lit-labs/signals';
import type { Signal } from '@lit-labs/signals';

const test = helpers.tenKitems1UpdateEach();

// a signal per item inside a signal of the list: the element subscribes to
// the list (so iteration is reactive to data-shape changes), while an item
// update flows through that item's own watch() into its own text node
const items = signal(
  test.getData().map((item): Signal.State<number | undefined> => signal(item)),
);

export class BenchApp extends SignalWatcher(LitElement) {
  // the bench verifies through the document, so render into the light DOM
  createRenderRoot() {
    return this;
  }

  firstUpdated() {
    test.doit((i: number) => {
      const item = items.get()[i];

      if (item) item.set(i);
    });
  }

  render() {
    // prettier-ignore
    return html`${items.get().map((item) =>
      watch(computed(() => test.formatItem(item.get()))),
    )}`;
  }
}

customElements.define('bench-app', BenchApp);
