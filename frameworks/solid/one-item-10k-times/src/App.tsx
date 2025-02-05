import { createSignal, createEffect } from 'solid-js'
import { helpers } from 'common';

function App() {
  const [count, setCount] = createSignal(0)

  createEffect(() => {
    helpers['1i10ku'].run((i) => setCount(i));
  }, [])

  return <output>{count()}</output>
}

export default App
