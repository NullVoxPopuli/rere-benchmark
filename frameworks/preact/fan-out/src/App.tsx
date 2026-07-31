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
  // this bench). Binding the signal (or a computed) per <span> notifies
  // 1k subscribers on every one of 10k writes, and even with the DOM flush
  // microtask-batched that measured 170x slower at a tenth of this
  // workload (36.8s vs 215ms, throttle x4) and never finished the full
  // one. Each consumer formats the value itself, like every other
  // framework's implementation.
  return <output>
    {test.consumerRange.map((c: number) => {
      return <span key={c}>{test.formatItem(value.value)}</span>;
    })}
  </output>
}

export default App
