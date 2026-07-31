import { helpers } from 'common';

const test = helpers.oneItem10kUpdates();

const output = document.createElement('output');
const text = document.createTextNode(test.formatItem(test.getData()));

output.append(text);
document.querySelector('#app').replaceChildren(output);

let latest;
let scheduled = false;

test.doit((value) => {
  latest = value;

  // coalesce each synchronous burst of writes into one DOM update, the
  // way the frameworks' schedulers do; when the bench yields between
  // writes (the async variants) the flush microtask runs before the
  // bench's own await resumes, so every update still reaches the DOM
  if (scheduled) return;

  scheduled = true;
  queueMicrotask(() => {
    scheduled = false;

    const next = test.formatItem(latest);

    // written in place: the text node is never replaced
    if (text.data !== next) {
      text.data = next;
    }
  });
});
