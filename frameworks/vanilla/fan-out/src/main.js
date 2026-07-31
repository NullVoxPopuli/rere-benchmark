import { helpers } from 'common';

const test = helpers.fanOut();

const output = document.createElement('output');
const initial = test.formatItem(test.getData());
const texts = test.consumerRange.map(() => {
  const span = document.createElement('span');
  const text = document.createTextNode(initial);

  span.append(text);
  output.append(span);

  return text;
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

    for (let i = 0; i < texts.length; i++) {
      // each consumer formats the shared value itself, like every
      // other implementation
      const next = test.formatItem(latest);
      const text = texts[i];

      // written in place: the text nodes are never replaced
      if (text.data !== next) {
        text.data = next;
      }
    }
  });
});
