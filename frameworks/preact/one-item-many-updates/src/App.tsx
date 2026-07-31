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
  // synchronous run of updates coalesces into one re-render. Binding the
  // signal as a text node measured 42.5s for the 100k sync bench vs 32ms
  // this way (throttle x4); it only wins on the (async) variants, and
  // mildly (500ms vs 672ms), because between-update yields let it write
  // just the text node while this version re-renders the component
  return <output>{test.formatItem(count.value)}</output>
}

export default App
