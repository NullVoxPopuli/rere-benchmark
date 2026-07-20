import { createSignal, createEffect, onMount } from 'solid-js'
import { helpers } from 'common';

const test = helpers.incrementingRenderEffect();

function App() {
  // -1 so the initial set(0) is not swallowed by signal equality
  const [output, setOutput] = createSignal(-1);
  let el!: HTMLOutputElement;
  let advancer: (() => void) | undefined;

  // createEffect runs after the DOM has been updated
  // (createRenderEffect / reading during render would run too early)
  createEffect(() => {
    output();
    advancer?.();
  });

  onMount(() => {
    test.doit({
      element: el,
      get: () => output(),
      set: (value: number) => setOutput(value),
      setupAdvancer: (fn: () => void) => { advancer = fn; },
    });
  });

  return <output ref={el}>{output()}</output>;
}

export default App
