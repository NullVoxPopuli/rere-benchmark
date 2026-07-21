import { createSignal, onMount } from 'solid-js'
import { helpers } from 'common';

let test = helpers.oneItem10kUpdates();

function App() {
  const [count, setCount] = createSignal(test.getData())

  onMount(() => {
    test.doit((i) => setCount(i));
  });

  return <output>{test.formatItem(count())}</output>
}

export default App
