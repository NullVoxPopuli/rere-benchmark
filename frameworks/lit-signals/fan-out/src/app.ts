import { helpers } from 'common';
import { html, LitElement } from 'lit';
import { signal, SignalWatcher } from '@lit-labs/signals';

const test = helpers.fanOut();

export class BenchApp extends SignalWatcher(LitElement) {
  value = signal(test.getData());

  // the bench verifies through the document, so render into the light DOM
  createRenderRoot() {
    return this;
  }

  firstUpdated() {
    test.doit((v: number) => this.value.set(v));
  }

  render() {
    // reading `.get()` during render subscribes the *element*, so a
    // synchronous burst of writes coalesces into one re-render that formats
    // the value once per consumer and writes each consumer's own span in
    // place -- the same per-consumer work ember and preact do per render.
    // A watch() per consumer would be more fine-grained, but each update
    // then re-evaluates two polyfill computeds per consumer: measured on
    // the full workload, that is ~6x slower than one element render pass.
    const value = this.value.get();

    // prettier-ignore
    return html`<output>${test.consumerRange.map(() =>
      html`<span>${test.formatItem(value)}</span>`,
    )}</output>`;
  }
}

customElements.define('bench-app', BenchApp);
