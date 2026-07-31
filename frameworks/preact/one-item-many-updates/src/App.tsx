import { useLayoutEffect } from 'preact/hooks'
import { useSignal, useComputed } from '@preact/signals'
import { helpers } from 'common';

const test = helpers.oneItem10kUpdates();

function App() {
  const count = useSignal(test.getData());
  const formatted = useComputed(() => test.formatItem(count.value));

  useLayoutEffect(() => {
    test.doit((i: number) => {
      count.value = i;
    });
  }, [])

  return <output>{formatted}</output>
}

export default App
