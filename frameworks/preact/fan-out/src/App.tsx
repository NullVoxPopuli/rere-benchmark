import { useLayoutEffect } from 'preact/hooks'
import { signal, computed } from '@preact/signals'
import { helpers } from 'common';

const test = helpers.fanOut();
const value = signal(test.getData());
// One computed for the formatted value; all consumer spans share it via
// direct signal binding so bursts of writes coalesce into a single
// fine-grained text-node update pass, bypassing VDOM reconciliation.
const formatted = computed(() => test.formatItem(value.value));

function App() {
  useLayoutEffect(() => {
    test.doit((v: number) => {
      value.value = v;
    });
  }, [])

  return <output>
    {test.consumerRange.map((c: number) => {
      return <span key={c}>{formatted}</span>;
    })}
  </output>
}

export default App
