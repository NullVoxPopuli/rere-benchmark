import { createEffect, For } from 'solid-js'
import { helpers } from 'common';
import { createStore } from 'solid-js/store';

const test = helpers.tenKitems1UpdateEach();

function App() {
  const [store, setStore] = createStore({ items: test.getData() });

  createEffect(() => {
    requestAnimationFrame(() => {
      test.run((i) => {
        setStore('items', (previous) => {
          let replacement = previous.map((item, index) => {
            return index === i ? i : item;
          });
          return replacement;
        });
      });
    })
  });

  return <For each={store.items}>{(i => test.formatItem(i))}</For>
}

export default App
