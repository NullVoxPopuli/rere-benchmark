import { createSignal, onSettled } from 'solid-js'
import { helpers } from 'common';

let test = helpers.oneItem10kUpdates();

function App() {
  const [count, setCount] = createSignal(test.getData())

  onSettled(() => {
    test.doit((i) => setCount(i));
  });

  return <output>{test.formatItem(count())}</output>
}

export default App
