import { useLayoutEffect } from 'preact/hooks'
import { useSignal } from '@preact/signals'
import { helpers } from 'common';

const test = helpers.fanOut();

function App() {
  const value = useSignal(test.getData());

  useLayoutEffect(() => {
    test.doit((v: number) => {
      value.value = v;
    });
  }, [])

  // reading `.value` during render subscribes the *component*, so a
  // synchronous burst of writes coalesces into one re-render (the point of
  // this bench) -- binding the signal per <span> would instead write every
  // span on every write: 10k updates x 1k consumers = 10M DOM writes.
  // Each consumer formats the value itself, like every other framework's
  // implementation.
  return <output>
    {test.consumerRange.map((c: number) => {
      return <span key={c}>{test.formatItem(value.value)}</span>;
    })}
  </output>
}

export default App
