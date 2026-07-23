import { helpers } from 'common';

const test = helpers.incrementingRenderEffect();

const output = document.createElement('output');

document.querySelector('#app').replaceChildren(output);

let value;
let advancer;

test.doit({
  element: output,
  get: () => value,
  set: (next) => {
    value = next;
    output.textContent = String(next);
    // a hand-written "render effect": the DOM for `next` is committed,
    // so let the bench observe it and advance
    advancer?.();
  },
  setupAdvancer: (fn) => {
    advancer = fn;
  },
});
