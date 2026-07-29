import { useState, useLayoutEffect } from 'react'
import { helpers } from 'common';

let test = helpers.oneItem10kUpdates();

function App() {
  const [count, setCount] = useState(test.getData());

  useLayoutEffect(() => {
    test.doit((i: number) => {
      setCount(i)
    }
    );
  }, [])

  return <output>{test.formatItem(count)}</output>
}

export default App
