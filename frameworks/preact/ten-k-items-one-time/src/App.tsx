import { useLayoutEffect } from 'preact/hooks'
import { computed, signal, useSignal } from '@preact/signals'
import { For } from '@preact/signals/utils'
import { helpers } from 'common';

const test = helpers.tenKitems1UpdateEach();

function App() {
  // a signal per item inside a signal of the list: <For> subscribes to the
  // list (so the iteration itself is reactive and tracks data-shape changes),
  // while an item update writes only that item's own text node
  const items = useSignal(test.getData().map((item) => signal(item)));

  useLayoutEffect(() => {
    test.doit((i) => {
      const item = items.value[i];

      if (item) item.value = i;
    });
  }, [])

  return (
    <For each={items}>
      {(item) => computed(() => test.formatItem(item.value))}
    </For>
  )
}

export default App
