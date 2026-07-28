import { createEffect, createStore, Repeat } from 'solid-js'
import { helpers } from 'common';

const test = helpers.tenKitems1UpdateEach();

function App() {
  const [store, setStore] = createStore({ items: test.getData() });

  // no more onMount in solid 2: an effect with an empty compute runs
  // once after the first render.
  // (v1 wrapped test.run in `batch`; solid 2 batches automatically,
  // so plain doit matches the other frameworks again)
  createEffect(() => {}, () => {
    test.doit((i) => {
      setStore((state) => {
        state.items[i] = i;
      });
    });
  });

  return (
    <Repeat count={store.items.length}>
      {index => <>{test.formatItem(store.items[index])}</>}
    </Repeat>
  )
}

export default App
