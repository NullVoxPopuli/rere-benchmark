import { createSignal, For, onMount } from 'solid-js'
import { helpers } from 'common';

let test = helpers.fanOut();

function App() {
  const [value, setValue] = createSignal(test.getData())

  onMount(() => {
    test.doit((v: number) => setValue(v));
  });

  return <output>
    <For each={test.consumerRange}>{() => <span>{test.formatItem(value())}</span>}</For>
  </output>
}

export default App
