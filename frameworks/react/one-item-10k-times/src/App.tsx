import { useState, useEffect } from 'react'
import { helpers } from 'common';

function App() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    helpers['1i10ku'].run((i) => setCount(i));
  }, [])

  return <output>{count}</output>
}

export default App
