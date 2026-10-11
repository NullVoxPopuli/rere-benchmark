import { useLayoutEffect } from 'react'
import { useReactive } from '@starbeam/react'
import { Cell } from '@starbeam/universal'
import { helpers } from 'common';

let test = helpers.oneItem10kUpdates();
let count = Cell(test.getData());

function App() {
  useLayoutEffect(() => {
    test.doit((i: number) => count.set(i));
  }, [])

  return useReactive(() => <output>{test.formatItem(count.current)}</output>)
}

export default App
