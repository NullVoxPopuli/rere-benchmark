import { useState, useEffect, useRef } from 'react'
import { helpers } from 'common';

const test = helpers.incrementingRenderEffect();

function App() {
  const [output, setOutput] = useState(-1);
  const advancerRef = useRef<(() => void) | undefined>();
  const outputRef = useRef(-1);
  outputRef.current = output;

  useEffect(() => {
    if (advancerRef.current) {
      advancerRef.current();
      return;
    }

    test.doit({
      get: () => outputRef.current,
      set: (value: number) => setOutput(value),
      setupAdvancer: (fn: () => void) => { advancerRef.current = fn; },
    });
  });

  return <output>{output}</output>
}

export default App
