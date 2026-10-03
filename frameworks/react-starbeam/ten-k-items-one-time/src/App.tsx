import React, { useLayoutEffect } from 'react'
import { useReactive } from '@starbeam/react'
import { reactive } from '@starbeam/collections'
import { helpers } from 'common';

let test = helpers.tenKitems1UpdateEach();
let items = reactive.array(test.getData());

function App() {
  useLayoutEffect(() => {
    test.doit((i) => {
      // in-place write: the reactive array tracks per index
      items[i] = i;
    });
  }, []);

  return useReactive(() => <>
    {items.map((item, index) => {
      // NOTE: using index for key is bad, but we have predictable data here
      return <React.Fragment key={index}>
        {test.formatItem(item)}
      </React.Fragment>;
    })}
  </>);
}

export default App
