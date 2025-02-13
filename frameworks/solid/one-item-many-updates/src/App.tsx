import { createSignal, batch, onMount } from 'solid-js'
import { helpers } from 'common';

let test = helpers.oneItem10kUpdates();

function App() {
  const [count, setCount] = createSignal(test.getData())

  onMount(() => {
    test.doit((i) => setCount(i), batch);
  });

  return <output>{test.formatItem(count())}</output>
}

export default App
