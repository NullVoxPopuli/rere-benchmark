import 'common/dbmon.css';
import { useState, useEffect, useRef } from 'react';
import { helpers, type DBRow, type ChatMessage, type DBUpdate, type ChatUpdate } from 'common';

const test = helpers.dbMonWithChat();

function App() {
  const [db, setDb] = useState<Map<string, DBRow>>(new Map());
  const [chats, setChats] = useState<ChatMessage[]>([]);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    test.doit({
      handleDbUpdate: (eventData: DBUpdate) => {
        setDb(prev => {
          const next = new Map(prev);
          for (const d of eventData.data) {
            next.set(d.dbname, d);
          }
          return next;
        });
      },
      handleChat: (eventData: ChatUpdate) => {
        setChats(prev => {
          const next = [...prev, ...eventData.data];
          return next.length > 12 ? next.slice(next.length - 12) : next;
        });
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
          {[...db.values()].map(row => (
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
  );
}

export default App;
