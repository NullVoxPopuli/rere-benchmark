import { createEffect, createSignal, For } from 'solid-js'
import { helpers } from 'common';

let test = helpers.fanOut();

function App() {
  const [value, setValue] = createSignal(test.getData())

  // no more onMount in solid 2: an effect with an empty compute runs
  // once after the first render
  createEffect(
    () => {},
    () => {
      test.doit((v: number) => setValue(v));
    },
  );

  return <output>
    <For each={test.consumerRange}>{() => <span>{test.formatItem(value())}</span>}</For>
  </output>
}

export default App
