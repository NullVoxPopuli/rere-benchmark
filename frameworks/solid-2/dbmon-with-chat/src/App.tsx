import 'common/dbmon.css';
import './layout.css';
import { createStore, For, onSettled } from 'solid-js';
import { helpers, type DBRow, type ChatMessage, type DBUpdate, type ChatUpdate } from 'common';

const test = helpers.dbMonWithChat();

const MAX_CHATS = 12;

function App() {
  const [db, setDb] = createStore<Record<string, DBRow>>({});
  const [chats, setChats] = createStore<ChatMessage[]>([]);

  onSettled(() => {
    test.doit({
      handleDbUpdate: (eventData: DBUpdate) => {
        setDb(rows => {
          for (const d of eventData.data) {
            rows[d.dbname] = d;
          }
        });
      },
      handleChat: (eventData: ChatUpdate) => {
        setChats(list => {
          for (const d of eventData.data) {
            list.push(d);
          }

          if (list.length > MAX_CHATS) {
            list.shift();
          }
        });
      },
    });
  });

  return (
    <div class="layout">
      <table>
        <thead>
          <tr>
            <th>dbname</th>
            <th>queries</th>
            <th colspan={5}>elapsed times</th>
          </tr>
        </thead>
        <tbody>
          <For each={Object.values(db)}>
            {(row) => (
              <tr>
                <td class="dbname">{row.dbname}</td>
                <td class="query-count">
                  <span class={row.lastSample.countClassName}>
                    {row.lastSample.queries.length}
                  </span>
                </td>
                <For each={row.lastSample.topFiveQueries} keyed={false}>
                  {(query) => (
                    <td>
                      {query().elapsed}
                      <div class="popover bottom">
                        <div class="popover-content">{query().query}</div>
                        <div class="arrow"></div>
                      </div>
                    </td>
                  )}
                </For>
              </tr>
            )}
          </For>
        </tbody>
      </table>

      <div class="chats">
        <div class="messages">
          <div class="messages-inner">
            <For each={chats}>
              {(chat) => (
                <div class="chat">
                  <div class="author">{chat.author}</div>
                  <p>{chat.message}</p>
                </div>
              )}
            </For>
          </div>
        </div>
        <div class="entry">
          <textarea placeholder="send a message"></textarea>
        </div>
      </div>
    </div>
  );
}

export default App;
