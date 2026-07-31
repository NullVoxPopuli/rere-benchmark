import 'common/dbmon.css';
import './layout.css';
import { useLayoutEffect } from 'preact/hooks';
import { useComputed, useSignal } from '@preact/signals';
import type { ReadonlySignal, Signal } from '@preact/signals';
import { For } from '@preact/signals/utils';
import { helpers } from 'common';
import type { ChatMessage, ChatUpdate, DBRow, DBUpdate } from 'common';

const test = helpers.dbMonWithChat();

function QueryCell({
  row,
  index,
}: {
  row: ReadonlySignal<DBRow>;
  index: number;
}) {
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

function Row({ db, name }: { db: Signal<Map<string, DBRow>>; name: string }) {
  const row = useComputed(() => db.value.get(name)!);
  const countClassName = useComputed(() => row.value.lastSample.countClassName);
  const queryCount = useComputed(() => row.value.lastSample.queries.length);
  const cells = row
    .peek()
    .lastSample.topFiveQueries.map((_, index) => (
      <QueryCell key={index} row={row} index={index} />
    ));

  return (
    <tr>
      <td className="dbname">{name}</td>
      <td className="query-count">
        <span className={countClassName}>{queryCount}</span>
      </td>
      {cells}
    </tr>
  );
}

function App() {
  const db = useSignal<Map<string, DBRow>>(new Map());
  const chats = useSignal<ChatMessage[]>([]);
  const names = useComputed(() => Array.from(db.value.keys()));

  useLayoutEffect(() => {
    test.doit({
      handleDbUpdate: (eventData: DBUpdate) => {
        const next = new Map(db.value);
        for (const d of eventData.data) {
          next.set(d.dbname, d);
        }
        db.value = next;
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
          <For each={names}>{(name) => <Row db={db} name={name} />}</For>
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
