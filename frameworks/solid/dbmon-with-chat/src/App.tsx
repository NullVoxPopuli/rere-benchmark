import 'common/dbmon.css';
import './layout.css';
import { createSignal, onMount, For } from 'solid-js';
import { helpers, type DBRow, type ChatMessage, type DBUpdate, type ChatUpdate } from 'common';

const test = helpers.dbMonWithChat();

function App() {
  const [db, setDb] = createSignal<Map<string, DBRow>>(new Map());
  const [chats, setChats] = createSignal<ChatMessage[]>([]);

  onMount(() => {
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
  });

  return (
    <div class="layout">
      <table>
        <thead>
          <tr>
            <th>dbname</th>
            <th>queries</th>
            <th colSpan={5}>elapsed times</th>
          </tr>
        </thead>
        <tbody>
          <For each={[...db().values()]}>
            {(row) => (
              <tr>
                <td class="dbname">{row.dbname}</td>
                <td class="query-count">
                  <span class={row.lastSample.countClassName}>
                    {row.lastSample.queries.length}
                  </span>
                </td>
                <For each={row.lastSample.topFiveQueries}>
                  {(query) => (
                    <td>
                      {query.elapsed}
                      <div class="popover bottom">
                        <div class="popover-content">{query.query}</div>
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
            <For each={chats()}>
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
