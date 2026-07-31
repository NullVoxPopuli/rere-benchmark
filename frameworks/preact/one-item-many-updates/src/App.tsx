import { useLayoutEffect } from 'preact/hooks'
import { useSignal } from '@preact/signals'
import { helpers } from 'common';

const test = helpers.oneItem10kUpdates();

function App() {
  const count = useSignal(test.getData());

  useLayoutEffect(() => {
    test.doit((i) => {
      count.value = i;
    });
  }, [])

  return <output>{test.formatItem(count.value)}</output>
}

export default App
