import { useLayoutEffect } from 'preact/hooks'
import { signal, computed } from '@preact/signals'
import { helpers } from 'common';

const test = helpers.oneItem10kUpdates();
const count = signal(test.getData());
// Bind the signal directly as a JSX child so updates go straight to the
// DOM text node without triggering a VDOM re-render of the component.
const formatted = computed(() => test.formatItem(count.value));

function App() {
  useLayoutEffect(() => {
    test.doit((i: number) => {
      count.value = i;
    });
  }, [])

  return <output>{formatted}</output>
}

export default App
