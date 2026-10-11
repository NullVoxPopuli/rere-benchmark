import 'common/dbmon.css';
import './layout.css';
import { useLayoutEffect, useRef } from 'react';
import { useReactive } from '@starbeam/react';
import { reactive } from '@starbeam/collections';
import { helpers, type DBRow, type ChatMessage, type DBUpdate, type ChatUpdate } from 'common';

const test = helpers.dbMonWithChat();
const db = reactive.Map<string, DBRow>();
const chats = reactive.array<ChatMessage>([]);

function App() {
  const started = useRef(false);

  useLayoutEffect(() => {
    if (started.current) return;
    started.current = true;

    test.doit({
      handleDbUpdate: (eventData: DBUpdate) => {
        for (const d of eventData.data) {
          db.set(d.dbname, d);
        }
      },
      handleChat: (eventData: ChatUpdate) => {
        for (const chat of eventData.data) {
          chats.push(chat);
        }
        if (chats.length > 12) {
          chats.splice(0, chats.length - 12);
        }
      },
    });
  }, []);

  return useReactive(() => (
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
          {Array.from(db.values()).map(row => (
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
            {chats.map((chat, i) => (
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
  ));
}

export default App;
