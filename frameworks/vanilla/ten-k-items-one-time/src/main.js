import { helpers } from 'common';

const test = helpers.tenKitems1UpdateEach();

const fragment = document.createDocumentFragment();
const texts = test.getData().map((item) => {
  const span = document.createElement('span');
  const text = document.createTextNode(test.formatItem(item));

  span.append(text);
  fragment.append(span);

  return text;
});

document.querySelector('#app').replaceChildren(fragment);

test.doit((index) => {
  const next = test.formatItem(index);
  const text = texts[index];

  // written in place, and only when the value actually changed (the
  // random variants can hit the same index twice)
  if (text.data !== next) {
    text.data = next;
  }
});
