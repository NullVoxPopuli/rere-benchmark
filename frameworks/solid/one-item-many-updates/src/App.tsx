import { createSignal, createEffect } from 'solid-js'
import { helpers } from 'common';

let test = helpers.oneItem10kUpdates();

function App() {
  const [count, setCount] = createSignal(test.getData())

  createEffect(() => {
    test.run((i) => setCount(i));
  }, [])

  return <output>{test.formatItem(count())}</output>
}

export default App
