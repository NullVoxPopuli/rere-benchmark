import { createSignal, createEffect, onSettled } from 'solid-js'
import { helpers } from 'common';

const test = helpers.incrementingRenderEffect();

function App() {
  // -1 so the initial set(0) is not swallowed by signal equality
  const [output, setOutput] = createSignal(-1);
  let el!: HTMLOutputElement;
  let advancer: (() => void) | undefined;

  // solid 2 split effects: the compute tracks `output`, the effect fn
  // runs after the DOM has been updated
  createEffect(
    () => output(),
    () => {
      advancer?.();
    },
  );

  onSettled(() => {
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
