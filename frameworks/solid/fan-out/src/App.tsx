import { createSignal, For, onSettled } from 'solid-js'
import { helpers } from 'common';

let test = helpers.fanOut();

function App() {
  const [value, setValue] = createSignal(test.getData())

  onSettled(() => {
    test.doit((v: number) => setValue(v));
  });

  return <output>
    <For each={test.consumerRange}>
      {() => <span textContent={test.formatItem(value())} />}
    </For>
  </output>
}

export default App
