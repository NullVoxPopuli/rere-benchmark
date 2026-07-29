import 'common/dbmon.css';
import './layout.css';
import { useLayoutEffect } from 'preact/hooks';
import { useSignal } from '@preact/signals';
import { helpers, type DBRow, type ChatMessage, type DBUpdate, type ChatUpdate } from 'common';

const test = helpers.dbMonWithChat();

function App() {
  // reading `.value` during render subscribes the component; each worker
  // message swaps in a new Map/array, re-rendering like the other
  // frameworks' dbmon implementations
  const db = useSignal<Map<string, DBRow>>(new Map());
  const chats = useSignal<ChatMessage[]>([]);

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
          {[...db.value.values()].map(row => (
            <tr key={row.dbname}>
              <td className="dbname">{row.dbname}</td>
              <td className="query-count">
                <span className={row.lastSample.countClassName}>
                  {row.lastSample.queries.length}
                </span>
              </td>
              {row.lastSample.topFiveQueries.map((query, i) => (
                <td key={i}>
                  {query.elapsed}
                  <div className="popover bottom">
                    <div className="popover-content">{query.query}</div>
                    <div className="arrow"></div>
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="chats">
        <div className="messages">
          <div className="messages-inner">
            {chats.value.map((chat, i) => (
              <div className="chat" key={i}>
                <div className="author">{chat.author}</div>
                <p>{chat.message}</p>
              </div>
            ))}
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
