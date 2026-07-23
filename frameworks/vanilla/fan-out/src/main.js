import { helpers } from 'common';

const test = helpers.fanOut();

const output = document.createElement('output');
const initial = test.formatItem(test.getData());
const spans = test.consumerRange.map(() => {
  const span = document.createElement('span');

  span.textContent = initial;
  output.append(span);

  return span;
});

document.querySelector('#app').replaceChildren(output);

let latest;
let scheduled = false;

test.doit((value) => {
  latest = value;

  // coalesce each burst of writes into one DOM update,
  // the way the frameworks' schedulers do
  if (scheduled) return;

  scheduled = true;
  queueMicrotask(() => {
    scheduled = false;

    const text = test.formatItem(latest);

    for (const span of spans) {
      span.textContent = text;
    }
  });
});
