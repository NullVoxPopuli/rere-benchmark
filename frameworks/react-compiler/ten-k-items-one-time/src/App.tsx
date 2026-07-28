import React, { useState, useEffect } from 'react'
import { helpers } from 'common';

let test = helpers.tenKitems1UpdateEach();

function App() {
  const [items, setItems] = useState(test.getData());

  useEffect(() => {
    test.doit((i) => {
      // https://react.dev/learn/updating-arrays-in-state#updating-arrays-without-mutation
      setItems((previous) => {
        let replacement = previous.map((item, index) => {
          return index === i ? i : item;
        });
        return replacement;
      });
    });
  }, []);

  return <>
    {items.map((i, index) => {
      // NOTE: using index for key is bad, but we have predictable data here
      return <React.Fragment key={index}>
        {test.formatItem(i)}
      </React.Fragment>;
    })}
  </>;
}

export default App
