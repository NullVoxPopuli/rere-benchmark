import { createEffect, createSignal } from 'solid-js'
import { helpers } from 'common';

let test = helpers.oneItem10kUpdates();

function App() {
  const [count, setCount] = createSignal(test.getData())

  // no more onMount in solid 2: an effect with an empty compute runs
  // once after the first render
  createEffect(() => {}, () => {
    test.doit((i) => setCount(i));
  });

  return <output>{test.formatItem(count())}</output>
}

export default App
