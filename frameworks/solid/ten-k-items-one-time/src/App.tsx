import { createEffect } from 'solid-js'
import { helpers } from 'common';
import { createStore } from "solid-js/store"

function App() {
  const [items, setItems] = createStore(Array(10_000));

  createEffect(() => {
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
