import { createSignal, createRenderEffect, onMount } from 'solid-js'
import { helpers } from 'common';

const test = helpers.incrementingRenderEffect();

function App() {
  const [output, setOutput] = createSignal(0);
  const [advancer, setAdvancer] = createSignal<(() => void) | undefined>();
  let el!: HTMLOutputElement;


  createRenderEffect(() => {
    output();
    advancer()?.();
  });

  onMount(() => {
    test.doit({
      element: el,
      get: () => output(),
      set: (value: number) => setOutput(value),
      setupAdvancer: (fn: () => void) => setAdvancer(() => fn),
    });
  });

  return <output ref={el}>{output()}</output>;
}

export default App
