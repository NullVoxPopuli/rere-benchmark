import 'common/dbmon.css';
import './layout.css';

import { helpers } from 'common';
import type { ChatMessage, ChatUpdate, DBRow, DBUpdate } from 'common';
import { html, LitElement } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { signal, SignalWatcher } from '@lit-labs/signals';

const test = helpers.dbMonWithChat();

export class BenchApp extends SignalWatcher(LitElement) {
  // reading `.get()` during render subscribes the element; each worker
  // message swaps in a new Map/array, re-rendering like the other
  // frameworks' dbmon implementations
  db = signal(new Map<string, DBRow>());
  chats = signal<ChatMessage[]>([]);

  // the bench verifies and styles through the document, so render into
  // the light DOM where common/dbmon.css and querySelector can reach
  createRenderRoot() {
    return this;
  }

  firstUpdated() {
    test.doit({
      handleDbUpdate: (eventData: DBUpdate) => {
        const next = new Map(this.db.get());

        for (const d of eventData.data) {
          next.set(d.dbname, d);
        }

        this.db.set(next);
      },
      handleChat: (eventData: ChatUpdate) => {
        const next = this.chats.get().concat(eventData.data);

        this.chats.set(next.length > 12 ? next.slice(next.length - 12) : next);
      },
    });
  }

  render() {
    return html`
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
            ${repeat(
              this.db.get().values(),
              (row) => row.dbname,
              (row) => html`
                <tr>
                  <td class="dbname">${row.dbname}</td>
                  <td class="query-count">
                    <span class=${row.lastSample.countClassName}>
                      ${row.lastSample.queries.length}
                    </span>
                  </td>
                  ${row.lastSample.topFiveQueries.map(
                    (query) => html`
                      <td>
                        ${query.elapsed}
                        <div class="popover bottom">
                          <div class="popover-content">${query.query}</div>
                          <div class="arrow"></div>
                        </div>
                      </td>
                    `,
                  )}
                </tr>
              `,
            )}
          </tbody>
        </table>

        <div class="chats">
          <div class="messages">
            <div class="messages-inner">
              ${this.chats.get().map(
                (chat) => html`
                  <div class="chat">
                    <div class="author">${chat.author}</div>
                    <p>${chat.message}</p>
                  </div>
                `,
              )}
            </div>
          </div>
          <div class="entry">
            <textarea placeholder="send a message"></textarea>
          </div>
        </div>
      </div>
    `;
  }
}

customElements.define('bench-app', BenchApp);
