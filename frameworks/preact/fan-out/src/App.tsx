import { useLayoutEffect } from 'preact/hooks'
import { useSignal } from '@preact/signals'
import { helpers } from 'common';

const test = helpers.fanOut();

function App() {
  const value = useSignal(test.getData());

  useLayoutEffect(() => {
    test.doit((v) => {
      value.value = v;
    });
  }, [])

  return <output>
    {test.consumerRange.map((c) => <span key={c}>{test.formatItem(value.value)}</span>)}
  </output>
}

export default App
