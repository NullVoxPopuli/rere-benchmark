import { helpers } from 'common';

const test = helpers.incrementingRenderEffect();

const output = document.createElement('output');
const text = document.createTextNode('');

output.append(text);
document.querySelector('#app').replaceChildren(output);

let value;
let advancer;

test.doit({
  element: output,
  get: () => value,
  set: (next) => {
    value = next;

    const rendered = String(next);

    // written in place: the text node is never replaced
    if (text.data !== rendered) {
      text.data = rendered;
    }

    // a hand-written "render effect": the DOM for `next` is committed,
    // so let the bench observe it and advance
    advancer?.();
  },
  setupAdvancer: (fn) => {
    advancer = fn;
  },
});
