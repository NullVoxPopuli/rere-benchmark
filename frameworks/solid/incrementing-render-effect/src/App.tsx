import { createSignal, createEffect } from 'solid-js'
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

  // no more onMount in solid 2: an effect with an empty compute runs
  // once after the first render
  createEffect(() => {}, () => {
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
