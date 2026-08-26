import { createSignal, createRenderEffect, onSettled, Repeat, type JSX } from 'solid-js'
import { helpers } from 'common';

const test = helpers.tenKitems1UpdateEach();

function App() {
  const items = test.getData().map(item => createSignal(item));

  // (v1 wrapped test.run in `batch`; solid 2 batches automatically,
  // so plain doit matches the other frameworks again)
  onSettled(() => {
    test.doit((i) => {
      items[i]?.[1](i);
    });
  });

  return (
    <Repeat count={items.length}>
      {index => {
        const item = items[index]![0];
        // a bare text child (`<>{...}</>`) would flatten into the parent
        // insert, which then re-normalizes the whole list on every update;
        // owning the node keeps each update a per-row `.data` write
        // (same pattern the solid-1 app uses)
        const node = document.createTextNode('');
        createRenderEffect(
          () => test.formatItem(item()),
          v => { node.data = v; },
        );
        return node as unknown as JSX.Element;
      }}
    </Repeat>
  )
}

export default App
