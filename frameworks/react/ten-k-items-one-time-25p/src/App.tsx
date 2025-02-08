import React, { useState, useEffect } from 'react'
import { helpers } from 'common';

function App() {
  const [items, setItems] = useState(Array(10_000).fill(0));

  useEffect(() => {
    helpers['10ki1u-25p'].run((i) => {
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
        {`${i} `}
      </React.Fragment>;
    })}
  </>;
}

export default App
