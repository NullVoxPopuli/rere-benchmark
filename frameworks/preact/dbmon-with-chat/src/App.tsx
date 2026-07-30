import 'common/dbmon.css';
import './layout.css';
import { useLayoutEffect } from 'preact/hooks';
import { signal } from '@preact/signals';
import { For } from '@preact/signals/utils';
import { helpers, type DBRow, type ChatMessage, type DBUpdate, type ChatUpdate } from 'common';
import type { Signal } from '@preact/signals';

const test = helpers.dbMonWithChat();

// One signal per row keyed by dbname; only the affected row re-renders on update.
const rowMap = new Map<string, Signal<DBRow>>();
const dbRows = signal<Signal<DBRow>[]>([]);
const chats = signal<ChatMessage[]>([]);

function Row({ row }: { row: Signal<DBRow> }) {
  const r = row.value;
  return (
    <tr>
      <td className="dbname">{r.dbname}</td>
      <td className="query-count">
        <span className={r.lastSample.countClassName}>
          {r.lastSample.queries.length}
        </span>
      </td>
      {r.lastSample.topFiveQueries.map((query, i) => (
        <td key={i}>
          {query.elapsed}
          <div className="popover bottom">
            <div className="popover-content">{query.query}</div>
            <div className="arrow"></div>
          </div>
        </td>
      ))}
    </tr>
  );
}

function ChatList() {
  return (
    <>
      {chats.value.map((chat, i) => (
        <div className="chat" key={i}>
          <div className="author">{chat.author}</div>
          <p>{chat.message}</p>
        </div>
      ))}
    </>
  );
}

function App() {
  useLayoutEffect(() => {
    test.doit({
      handleDbUpdate: (eventData: DBUpdate) => {
        const newRows: Signal<DBRow>[] = [];
        for (const d of eventData.data) {
          const existing = rowMap.get(d.dbname);
          if (existing) {
            existing.value = d;
          } else {
            const row = signal(d);
            rowMap.set(d.dbname, row);
            newRows.push(row);
          }
        }
        if (newRows.length > 0) {
          dbRows.value = [...dbRows.value, ...newRows];
        }
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
