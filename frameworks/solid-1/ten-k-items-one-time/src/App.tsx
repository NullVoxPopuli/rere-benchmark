import { createRenderEffect, createSignal, For, onMount } from 'solid-js'
import { helpers } from 'common';

const test = helpers.tenKitems1UpdateEach();

function App() {
  // one signal per item: each row tracks only its own signal, and the
  // array itself never changes, so <For> builds the rows exactly once
  const items = test.getData().map(item => createSignal(item));

  onMount(() => {
    test.doit((i) => {
      items[i]?.[1](i);
    });
  });

  return (
    <For each={items}>
      {([item]) => {
        // a bare text child (`<>{...}</>`) would be re-normalized by the
        // parent insert on every update, swapping every row's text node;
        // owning the node and writing `.data` is what the compiler emits
        // for element-wrapped text, without adding a wrapper element
        const node = document.createTextNode('');
        createRenderEffect(() => (node.data = test.formatItem(item())));
        return node;
      }}
    </For>
  )
}

export default App
