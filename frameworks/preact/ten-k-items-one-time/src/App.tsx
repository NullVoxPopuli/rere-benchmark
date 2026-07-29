import { useLayoutEffect } from 'preact/hooks'
import { computed, signal } from '@preact/signals'
import { helpers } from 'common';

const test = helpers.tenKitems1UpdateEach();

// one signal per item, so each update writes only its own text node
const items = test.getData().map((item) => signal(item));
const labels = items.map((item) => computed(() => test.formatItem(item.value)));

function App() {
  useLayoutEffect(() => {
    test.doit((i: number) => {
      items[i]!.value = i;
    });
  }, [])

  return <>{labels}</>
}

export default App
