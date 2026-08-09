import { useLayoutEffect, useRef } from 'react'
import { useReactive } from '@starbeam/react'
import { Cell } from '@starbeam/universal'
import { helpers } from 'common';

const test = helpers.incrementingRenderEffect();
const output = Cell(-1);

function App() {
  const advancerRef = useRef<(() => void) | undefined>(undefined);
  const elRef = useRef<HTMLOutputElement>(null);

  const value = useReactive(() => output.current);

  useLayoutEffect(() => {
    if (advancerRef.current) {
      advancerRef.current();
      return;
    }

    test.doit({
      element: elRef.current!,
      get: () => output.current,
      set: (v: number) => output.set(v),
      setupAdvancer: (fn: () => void) => { advancerRef.current = fn; },
    });
  });

  return <output ref={elRef}>{value}</output>
}

export default App
