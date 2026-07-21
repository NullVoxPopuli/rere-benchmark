import "common/dbmon.css";

import Component from "@glimmer/component";
import { trackedArray, trackedMap } from "@ember/reactive/collections";

import { type ChatMessage, type ChatUpdate, type DBRow, type DBUpdate, helpers } from "common";

const test = helpers.dbMonWithChat();

export default class Test extends Component {
  db = trackedMap<string, DBRow>();
  chats = trackedArray<ChatMessage>();

  // rendered with a keyed {{#each}}: {{#each-in}} tears down and rebuilds
  // every row on any map change (~4x fps difference on this bench)
  get rows() {
    return Array.from(this.db.values());
  }

  start = () => {
    test.doit({
      handleDbUpdate: (eventData: DBUpdate) => {
        for (const d of eventData.data) {
          this.db.set(d.dbname, d);
        }
      },
      handleChat: (eventData: ChatUpdate) => {
        for (const d of eventData.data) {
          this.chats.push(d);
        }

        if (this.chats.length > 12) {
          this.chats.shift();
        }
      },
    });
  };

  <template>
    <div class="layout">
      <table>
        <thead><tr>
            <th>dbname</th>
            <th>queries</th>
            <th colspan="5">elapsed times</th>
          </tr></thead>
        <tbody>
          {{#each this.rows key="dbname" as |row|}}
            <tr>
              <td class="dbname">
                {{row.dbname}}
              </td>
              <td class="query-count">
                <span class="{{row.lastSample.countClassName}}">
                  {{row.lastSample.queries.length}}
                </span>
              </td>
              {{#each row.lastSample.topFiveQueries key="@index" as |query|}}
                <td>{{query.elapsed}}</td>
                <div class="popover bottom">
                  <div class="popover-content">{{query.query}}</div>
                  <div class="arrow"></div>
                </div>
              {{/each}}
            </tr>
          {{/each}}
        </tbody>
      </table>

      <div class="chats">
        <div class="messages">
          <div class="messages-inner">
            {{#each this.chats as |chat|}}
              <div class="chat">
                <div class="author">{{chat.author}}</div>
                <p>{{chat.message}}</p>
              </div>
            {{/each}}
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

        table {
          font-family: monospace;
        }
      }
      .chats {
        display: flex;
        flex-direction: column;
        max-height: 600px;

        .messages {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column-reverse;
        }

        .entry {
          flex-shrink: 0;

          textarea {
            width: 100%;
            padding: 1rem;
          }
        }
      }
      .chat {
        .author {
          font-weight: bold;
        }
      }
    </style>

    {{(this.start)}}
  </template>
}
