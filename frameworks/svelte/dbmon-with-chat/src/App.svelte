<script lang="ts">
  import 'common/dbmon.css';
  import { helpers, type DBRow, type ChatMessage, type DBUpdate, type ChatUpdate } from 'common';

  const test = helpers.dbMonWithChat();
  let db: Map<string, DBRow> = $state(new Map());
  let chats: ChatMessage[] = $state([]);

  $effect(() => {
    test.doit({
      handleDbUpdate: (eventData: DBUpdate) => {
        for (const d of eventData.data) {
          db.set(d.dbname, d);
        }
        db = new Map(db);
      },
      handleChat: (eventData: ChatUpdate) => {
        for (const d of eventData.data) {
          chats.push(d);
        }
        if (chats.length > 12) {
          chats.splice(0, chats.length - 12);
        }
      },
    });
  });
</script>

<div class="layout">
  <table>
    <thead>
      <tr>
        <th>dbname</th>
        <th>queries</th>
        <th colspan="5">elapsed times</th>
      </tr>
    </thead>
    <tbody>
      {#each db.values() as row (row.dbname)}
        <tr>
          <td class="dbname">{row.dbname}</td>
          <td class="query-count">
            <span class={row.lastSample.countClassName}>
              {row.lastSample.queries.length}
            </span>
          </td>
          {#each row.lastSample.topFiveQueries as query, i}
            <td>
              {query.elapsed}
              <div class="popover bottom">
                <div class="popover-content">{query.query}</div>
                <div class="arrow"></div>
              </div>
            </td>
          {/each}
        </tr>
      {/each}
    </tbody>
  </table>

  <div class="chats">
    <div class="messages">
      <div class="messages-inner">
        {#each chats as chat, i (i)}
          <div class="chat">
            <div class="author">{chat.author}</div>
            <p>{chat.message}</p>
          </div>
        {/each}
      </div>
    </div>
    <div class="entry">
      <textarea placeholder="send a message"></textarea>
    </div>
  </div>
</div>

<style>
  * {
    box-sizing: border-box;
  }
  .layout {
    display: grid;
    grid-template-columns: 75% 25%;
    gap: 0.5rem;
    align-items: start;
  }
  table {
    font-family: monospace;
  }
  .chats {
    display: flex;
    flex-direction: column;
    max-height: 600px;
  }
  .messages {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column-reverse;
  }
  .entry {
    flex-shrink: 0;
  }
  .entry textarea {
    width: 100%;
    padding: 1rem;
  }
  .chat .author {
    font-weight: bold;
  }
</style>
