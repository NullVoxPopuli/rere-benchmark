import { useState, useEffect, useRef } from 'react'
import { helpers } from 'common';

const test = helpers.incrementingRenderEffect();

function App() {
  const [output, setOutput] = useState(-1);
  const advancerRef = useRef<(() => void) | undefined>();
  const outputRef = useRef(-1);
  const elRef = useRef<HTMLOutputElement>(null);
  outputRef.current = output;

  useEffect(() => {
    if (advancerRef.current) {
      advancerRef.current();
      return;
    }

    test.doit({
      element: elRef.current!,
      get: () => outputRef.current,
      set: (value: number) => setOutput(value),
      setupAdvancer: (fn: () => void) => { advancerRef.current = fn; },
    });
  });

  return <output ref={elRef}>{output}</output>
}

export default App
