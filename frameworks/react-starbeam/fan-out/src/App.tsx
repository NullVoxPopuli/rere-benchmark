import { useLayoutEffect } from 'react'
import { useReactive } from '@starbeam/react'
import { Cell } from '@starbeam/universal'
import { helpers } from 'common';

let test = helpers.fanOut();
let value = Cell(test.getData());

function App() {
  useLayoutEffect(() => {
    test.doit((v: number) => value.set(v));
  }, [])

  return useReactive(() => (
    <output>
      {test.consumerRange.map((c: number) => {
        return <span key={c}>{test.formatItem(value.current)}</span>;
      })}
    </output>
  ))
}

export default App
