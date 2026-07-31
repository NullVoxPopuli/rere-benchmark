import 'common/dbmon.css';
import './layout.css';
import { useLayoutEffect, useMemo } from 'preact/hooks';
import { batch, signal, useComputed, useSignal } from '@preact/signals';
import { For } from '@preact/signals/utils';
import { helpers, type DBRow, type ChatMessage, type DBUpdate, type ChatUpdate } from 'common';
import type { Signal } from '@preact/signals';

const test = helpers.dbMonWithChat();

// one signal per row: writing it updates only that row's bindings, so a
// worker message re-renders nothing -- the changed text nodes update in
// place (measured: ~27fps vs ~18fps for swap-the-whole-Map, throttle x8)
function Row({ row }: { row: Signal<DBRow> }) {
  const dbname = useComputed(() => row.value.dbname);
  const countClassName = useComputed(() => row.value.lastSample.countClassName);
  const queryCount = useComputed(() => row.value.lastSample.queries.length);
  const topFiveQueries = useComputed(() => row.value.lastSample.topFiveQueries);

  return (
    <tr>
      <td className="dbname">{dbname}</td>
      <td className="query-count">
        <span className={countClassName}>{queryCount}</span>
      </td>
      <For each={topFiveQueries}>
        {(query) => (
          <td>
            {query.elapsed}
            <div className="popover bottom">
              <div className="popover-content">{query.query}</div>
              <div className="arrow"></div>
            </div>
          </td>
        )}
      </For>
    </tr>
  );
}

function ChatList({ chats }: { chats: Signal<ChatMessage[]> }) {
  return (
    <For each={chats}>
      {(chat) => (
        <div className="chat">
          <div className="author">{chat.author}</div>
          <p>{chat.message}</p>
        </div>
      )}
    </For>
  );
}

function App() {
  const rows = useSignal<Signal<DBRow>[]>([]);
  const chats = useSignal<ChatMessage[]>([]);
  // index into `rows` by dbname; not reactive state, just a lookup
  const rowMap = useMemo(() => new Map<string, Signal<DBRow>>(), []);

  useLayoutEffect(() => {
    test.doit({
      handleDbUpdate: (eventData: DBUpdate) => {
        batch(() => {
          let added: Signal<DBRow>[] | undefined;

          for (const d of eventData.data) {
            const existing = rowMap.get(d.dbname);

            if (existing) {
              existing.value = d;
            } else {
              const row = signal(d);
              rowMap.set(d.dbname, row);
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
          <For each={rows}>
            {(row) => <Row row={row} />}
          </For>
        </tbody>
      </table>

      <div className="chats">
        <div className="messages">
          <div className="messages-inner">
            <ChatList chats={chats} />
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
