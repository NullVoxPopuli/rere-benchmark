import { useLayoutEffect, useRef } from 'preact/hooks'
import { useSignal } from '@preact/signals'
import { helpers } from 'common';

const test = helpers.incrementingRenderEffect();

function App() {
  // reading `.value` during render (rather than binding the signal as a
  // text node) subscribes the component, so every update re-renders and
  // the layout effect below runs again -- which is exactly what this
  // bench measures
  const output = useSignal(-1);
  const advancerRef = useRef<(() => void) | undefined>(undefined);
  const elRef = useRef<HTMLOutputElement>(null);

  useLayoutEffect(() => {
    if (advancerRef.current) {
      advancerRef.current();
      return;
    }

    test.doit({
      element: elRef.current!,
      get: () => output.value,
      set: (value: number) => {
        output.value = value;
      },
      setupAdvancer: (fn: () => void) => { advancerRef.current = fn; },
    });
  });

  return <output ref={elRef}>{output.value}</output>
}

export default App
