<script setup lang="ts">
import 'common/dbmon.css';
import { reactive, ref } from 'vue';
import { helpers, type DBRow, type ChatMessage, type DBUpdate, type ChatUpdate } from 'common';

const test = helpers.dbMonWithChat();
const db = reactive(new Map<string, DBRow>());
const chats = ref<ChatMessage[]>([]);

test.doit({
  handleDbUpdate: (eventData: DBUpdate) => {
    for (const d of eventData.data) {
      db.set(d.dbname, d);
    }
  },
  handleChat: (eventData: ChatUpdate) => {
    for (const d of eventData.data) {
      chats.value.push(d);
    }
    if (chats.value.length > 12) {
      chats.value.splice(0, chats.value.length - 12);
    }
  },
});
</script>

<template>
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
        <tr v-for="[id, row] in db" :key="id">
          <td class="dbname">{{ id }}</td>
          <td class="query-count">
            <span :class="row.lastSample.countClassName">
              {{ row.lastSample.queries.length }}
            </span>
          </td>
          <template v-for="(query, i) in row.lastSample.topFiveQueries" :key="i">
            <td>
              {{ query.elapsed }}
              <div class="popover bottom">
                <div class="popover-content">{{ query.query }}</div>
                <div class="arrow"></div>
              </div>
            </td>
          </template>
        </tr>
      </tbody>
    </table>

    <div class="chats">
      <div class="messages">
        <div class="messages-inner">
          <div class="chat" v-for="(chat, i) in chats" :key="i">
            <div class="author">{{ chat.author }}</div>
            <p>{{ chat.message }}</p>
          </div>
        </div>
      </div>
      <div class="entry">
        <textarea placeholder="send a message"></textarea>
      </div>
    </div>
  </div>
</template>

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
