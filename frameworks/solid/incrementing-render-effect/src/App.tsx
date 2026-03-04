import { createSignal } from 'solid-js'
import { helpers } from 'common';

const test = helpers.incrementingRenderEffect();

function App() {
  const [output, setOutput] = createSignal(0);
  const [advancer, setAdvancer] = createSignal<(() => void) | undefined>();

  function run() {
    let value = output();
    advancer()?.();
    return value;
  }

  test.doit({
    get: () => output(),
    set: (value: number) => setOutput(value),
    setupAdvancer: (fn: () => void) => setAdvancer(() => fn),
  });

  return <output>{run()}</output>
}

export default App
