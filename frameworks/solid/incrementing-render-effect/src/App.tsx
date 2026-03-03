import { createSignal, createRenderEffect } from 'solid-js'
import { helpers } from 'common';

const test = helpers.incrementingRenderEffect();

function App() {
  const [output, setOutput] = createSignal(-1);
  let advancer: (() => void) | undefined;

  createRenderEffect(() => {
    if (advancer) {
      advancer();
      return;
    }

    test.doit({
      get: () => output(),
      set: (value: number) => setOutput(value),
      setupAdvancer: (fn: () => void) => { advancer = fn; },
    });
  });

  return <output>{output()}</output>
}

export default App
