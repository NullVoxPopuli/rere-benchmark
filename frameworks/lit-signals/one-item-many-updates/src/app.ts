import { helpers } from 'common';
import { html, LitElement } from 'lit';
import { computed, signal, SignalWatcher, watch } from '@lit-labs/signals';

const test = helpers.oneItem10kUpdates();

export class BenchApp extends SignalWatcher(LitElement) {
  count = signal(test.getData());
  formatted = computed(() => test.formatItem(this.count.get()));

  // the bench verifies through the document, so render into the light DOM
  createRenderRoot() {
    return this;
  }

  firstUpdated() {
    test.doit((i: number) => this.count.set(i));
  }

  render() {
    // watch() binds the signal to the text node: the element renders once,
    // then each update writes that node in place. Pending watches flush
    // once per microtask, so a synchronous run of updates still coalesces
    // into one DOM write, like the other frameworks' render batching.
    return html`<output>${watch(this.formatted)}</output>`;
  }
}

customElements.define('bench-app', BenchApp);
