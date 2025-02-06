import { createEffect, For } from 'solid-js'
import { helpers } from 'common';
import { createStore } from 'solid-js/store';

function App() {
  const [store, setStore] = createStore({ items: Array(10_000) });

  createEffect(() => {
    requestAnimationFrame(() => {
      helpers['10ki1u'].run((i) => {
        setStore('items', (previous) => {
          let replacement = previous.map((item, index) => {
            return index === i ? i : item;
          });
          return replacement;
        });
      });
    })
  });

  return <For each={store.items}>{(i => `${i} `)}</For>
}

export default App
