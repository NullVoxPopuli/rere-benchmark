import "common/dbmon.css";

import Component from "@glimmer/component";
import { helpers } from "common";

import { trackedMap, trackedArray } from "@ember/reactive/collections";

const test = helpers.dbMonWithChat();

export default class Test extends Component {
  db = trackedMap();
  chats = trackedArray();

  start = () => {
    test.doit({
      handleDbUpdate: (eventData) => {
        for (const d of eventData.data) {
          this.db.set(d.dbname, d);
        }
      },
      handleChat: (eventData) => {
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
          {{#each-in this.db as |id row|}}
            <tr>
              <td class="dbname">
                {{id}}
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
          {{/each-in}}
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
