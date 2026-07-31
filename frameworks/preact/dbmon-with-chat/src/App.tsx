import 'common/dbmon.css';
import './layout.css';
import { useLayoutEffect, useMemo } from 'preact/hooks';
import { batch, signal, useComputed, useSignal } from '@preact/signals';
import type { Signal } from '@preact/signals';
import { For } from '@preact/signals/utils';
import { helpers } from 'common';
import type { ChatMessage, ChatUpdate, DBRow, DBUpdate } from 'common';

const test = helpers.dbMonWithChat();

// Cells are positional, like the ember app's key="@index" iteration: the
// worker structured-clones fresh query objects on every message, so
// identity-keyed iteration (<For>) would tear down and rebuild all five
// <td> subtrees per update instead of writing the changed text in place.
function QueryCell({ row, index }: { row: Signal<DBRow>; index: number }) {
  const elapsed = useComputed(
    () => row.value.lastSample.topFiveQueries[index]?.elapsed,
  );
  const query = useComputed(
    () => row.value.lastSample.topFiveQueries[index]?.query,
  );

  return (
    <td>
      {elapsed}
      <div className="popover bottom">
        <div className="popover-content">{query}</div>
        <div className="arrow"></div>
      </div>
    </td>
  );
}

// One signal per row: a worker message writes only the signals of the rows
// it carries, and those rows' bindings update in place -- nothing
// re-renders, matching the granularity of the ember app's keyed rows.
function Row({ row }: { row: Signal<DBRow> }) {
  const dbname = useComputed(() => row.value.dbname);
  const countClassName = useComputed(() => row.value.lastSample.countClassName);
  const queryCount = useComputed(() => row.value.lastSample.queries.length);
  // peek: the sample always carries five queries, so the cell count is
  // static -- subscribing here would re-render the whole row every update
  const cells = row
    .peek()
    .lastSample.topFiveQueries.map((_, index) => (
      <QueryCell key={index} row={row} index={index} />
    ));

  return (
    <tr>
      <td className="dbname">{dbname}</td>
      <td className="query-count">
        <span className={countClassName}>{queryCount}</span>
      </td>
      {cells}
    </tr>
  );
}

function App() {
  const rows = useSignal<Signal<DBRow>[]>([]);
  const chats = useSignal<ChatMessage[]>([]);
  // index into `rows` by dbname; not reactive state, just a lookup
  const rowsByName = useMemo(() => new Map<string, Signal<DBRow>>(), []);

  useLayoutEffect(() => {
    test.doit({
      handleDbUpdate: (eventData: DBUpdate) => {
        batch(() => {
          let added: Signal<DBRow>[] | undefined;

          for (const d of eventData.data) {
            const existing = rowsByName.get(d.dbname);

            if (existing) {
              existing.value = d;
            } else {
              const row = signal(d);

              rowsByName.set(d.dbname, row);
              (added ??= []).push(row);
            }
          }

          if (added) {
            rows.value = rows.value.concat(added);
          }
        });
      },
      handleChat: (eventData: ChatUpdate) => {
        const next = chats.value.concat(eventData.data);

        chats.value = next.length > 12 ? next.slice(next.length - 12) : next;
      },
    });
  }, []);

  return (
    <div className="layout">
      <table>
        <thead>
          <tr>
            <th>dbname</th>
            <th>queries</th>
            <th colSpan={5}>elapsed times</th>
          </tr>
        </thead>
        <tbody>
          <For each={rows}>{(row) => <Row row={row} />}</For>
        </tbody>
      </table>

      <div className="chats">
        <div className="messages">
          <div className="messages-inner">
            <For each={chats}>
              {(chat) => (
                <div className="chat">
                  <div className="author">{chat.author}</div>
                  <p>{chat.message}</p>
                </div>
              )}
            </For>
          </div>
        </div>
        <div className="entry">
          <textarea placeholder="send a message"></textarea>
        </div>
      </div>
    </div>
  );
}

export default App;
