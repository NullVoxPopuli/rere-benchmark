import { For, onMount, batch } from 'solid-js'
import { helpers } from 'common';
import { createStore } from 'solid-js/store';

const test = helpers.tenKitems1UpdateEach();

function App() {
  const [store, setStore] = createStore({ items: test.getData() });

  onMount(() => {
    test.run((i) => {
      setStore('items', i, i);
    }, batch);
  });

  return <For each={store.items}>{i => test.formatItem(i)}</For>
}

export default App
