import { useState, useEffect } from 'react'
import { helpers } from 'common';

function App() {
  const [items, setItems] = useState(Array(10_000))

  useEffect(() => {
    helpers['10ki1u'].run((i) => {
      items[i] = i;
      setItems(items);
    });
  }, [])

  return <>{items.map(i => {
    return <>
      {i}
    </>;
  })}</>
}

export default App
