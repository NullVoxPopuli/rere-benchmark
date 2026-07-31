import 'common/dbmon.css';
import './layout.css';
import { useLayoutEffect } from 'preact/hooks';
import { signal, computed, batch, useComputed } from '@preact/signals';
import { For } from '@preact/signals/utils';
import { helpers, type DBRow, type ChatMessage, type DBUpdate, type ChatUpdate } from 'common';
import type { Signal } from '@preact/signals';

const test = helpers.dbMonWithChat();

// One signal per row keyed by dbname; only the affected row re-renders on update.
const rowMap = new Map<string, Signal<DBRow>>();
const dbRows = signal<Signal<DBRow>[]>([]);
const chats = signal<ChatMessage[]>([]);

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
            {computed(() => query.value.elapsed)}
            <div className="popover bottom">
              <div className="popover-content">{computed(() => query.value.query)}</div>
              <div className="arrow"></div>
            </div>
          </td>
        )}
      </For>
    </tr>
  );
}

function ChatList() {
  return (
    <For each={chats}>
      {(chat) => (
        <div className="chat">
          <div className="author">{computed(() => chat.value.author)}</div>
          <p>{computed(() => chat.value.message)}</p>
        </div>
      )}
    </For>
  );
}

function App() {
  useLayoutEffect(() => {
    test.doit({
      handleDbUpdate: (eventData: DBUpdate) => {
        batch(() => {
          for (const d of eventData.data) {
            const existing = rowMap.get(d.dbname);
            if (existing) {
              existing.value = d;
            } else {
              const row = signal(d);
              rowMap.set(d.dbname, row);
              dbRows.value = [...dbRows.value, row];
            }
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
          <For each={dbRows}>
            {(row) => <Row row={row} />}
          </For>
        </tbody>
      </table>

      <div className="chats">
        <div className="messages">
          <div className="messages-inner">
            <ChatList />
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
