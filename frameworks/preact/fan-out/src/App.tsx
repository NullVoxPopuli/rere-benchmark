import { useLayoutEffect } from 'preact/hooks'
import { useSignal, useComputed } from '@preact/signals'
import { helpers } from 'common';

const test = helpers.fanOut();

function App() {
  const value = useSignal(test.getData());
  const formatted = useComputed(() => test.formatItem(value.value));

  useLayoutEffect(() => {
    test.doit((v: number) => {
      value.value = v;
    });
  }, [])

  return <output>
    {test.consumerRange.map((c: number) => {
      return <span key={c}>{formatted}</span>;
    })}
  </output>
}

export default App
