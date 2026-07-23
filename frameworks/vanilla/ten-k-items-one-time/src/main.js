import { helpers } from 'common';

const test = helpers.tenKitems1UpdateEach();

const fragment = document.createDocumentFragment();
const spans = test.getData().map((item) => {
  const span = document.createElement('span');

  span.textContent = test.formatItem(item);
  fragment.append(span);

  return span;
});

document.querySelector('#app').replaceChildren(fragment);

test.doit((index) => {
  spans[index].textContent = test.formatItem(index);
});
