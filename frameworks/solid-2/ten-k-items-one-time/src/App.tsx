import { createSignal, onSettled, Repeat } from 'solid-js'
import { helpers } from 'common';

const test = helpers.tenKitems1UpdateEach();

function App() {
  const items = test.getData().map(item => createSignal(item));

  // (v1 wrapped test.run in `batch`; solid 2 batches automatically,
  // so plain doit matches the other frameworks again)
  onSettled(() => {
    test.doit((i) => {
      items[i]?.[1](i);
    });
  });

  return (
    <Repeat count={items.length}>
      {index => {
        const item = items[index]![0];
        return <>{test.formatItem(item())}</>;
      }}
    </Repeat>
  )
}

export default App
