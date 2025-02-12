import { useState, useEffect } from 'react'
import { helpers } from 'common';

let test = helpers.oneItem10kUpdates();

function App() {
  const [count, setCount] = useState(test.getData());

  useEffect(() => {
    test.doit((i: number) => setCount(i));
  }, [])

  return <output>{test.formatItem(count)}</output>
}

export default App
