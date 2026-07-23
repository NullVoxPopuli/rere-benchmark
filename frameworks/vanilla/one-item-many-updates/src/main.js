import { helpers } from 'common';

const test = helpers.oneItem10kUpdates();

const output = document.createElement('output');

output.textContent = test.formatItem(test.getData());
document.querySelector('#app').replaceChildren(output);

let latest;
let scheduled = false;

test.doit((value) => {
  latest = value;

  // coalesce a synchronous burst of writes into one DOM update,
  // the way the frameworks' schedulers do
  if (scheduled) return;

  scheduled = true;
  queueMicrotask(() => {
    scheduled = false;
    output.textContent = test.formatItem(latest);
  });
});
