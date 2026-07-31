import { helpers } from 'common';
import { html, LitElement } from 'lit';
import { signal, SignalWatcher } from '@lit-labs/signals';

const test = helpers.incrementingRenderEffect();

export class BenchApp extends SignalWatcher(LitElement) {
  // -1 so the initial set(0) is not swallowed by the signal's Object.is
  // equality, same as the other frameworks
  out = signal(-1);

  #advancer: (() => void) | undefined;

  // the bench verifies through the document, so render into the light DOM
  createRenderRoot() {
    return this;
  }

  firstUpdated() {
    test.doit({
      element: this.querySelector('output')!,
      get: () => this.out.get(),
      set: (value: number) => this.out.set(value),
      setupAdvancer: (fn: () => void) => (this.#advancer = fn),
    });
  }

  // updated() runs after every commit, like the other frameworks' render
  // effects (ember's modifier re-run, preact's useLayoutEffect)
  updated() {
    this.#advancer?.();
  }

  render() {
    // reading the signal here subscribes the whole element, so every
    // update runs a full render + updated() pass -- the render-effect
    // cycle this bench measures
    return html`<output>${this.out.get()}</output>`;
  }
}

customElements.define('bench-app', BenchApp);
