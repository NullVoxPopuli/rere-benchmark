import { useState, useEffect } from 'react'
import { helpers } from 'common';

let test = helpers.fanOut();

function App() {
  const [value, setValue] = useState(test.getData());

  useEffect(() => {
    test.doit((v: number) => {
      setValue(v)
    });
  }, [])

  return <output>
    {test.consumerRange.map((c: number) => {
      return <span key={c}>{test.formatItem(value)}</span>;
    })}
  </output>
}

export default App
