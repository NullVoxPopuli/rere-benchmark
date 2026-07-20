import { createSignal, createRenderEffect, onMount } from 'solid-js'
import { helpers } from 'common';

const test = helpers.incrementingRenderEffect();


function App() {
  const [output, setOutput] = createSignal(0);
  let el!: HTMLOutputElement;
  let advancer;


  const read =() => {
    advancer?.();
    return output();
  };

  onMount(() => {
    test.doit({
      element: el,
      get: () => output(),
      set: (value: number) => setOutput(value),
      setupAdvancer: (fn: () => void) => void (advancer = fn),
    });
  });

  return <output ref={el}>{read()}</output>;
}

export default App
