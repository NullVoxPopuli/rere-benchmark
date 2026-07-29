import { useLayoutEffect } from 'preact/hooks'
import { useSignal } from '@preact/signals'
import { helpers } from 'common';

const test = helpers.oneItem10kUpdates();

function App() {
  const count = useSignal(test.getData());

  useLayoutEffect(() => {
    test.doit((i: number) => {
      count.value = i;
    });
  }, [])

  // reading `.value` during render subscribes the *component*, so a
  // synchronous run of updates coalesces into one re-render -- binding the
  // signal as a text node would instead write the DOM once per update
  return <output>{test.formatItem(count.value)}</output>
}

export default App
