import { afterNextRender, ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { helpers } from 'common';

import type { ChatMessage, ChatUpdate, DBRow, DBUpdate } from 'common';

const test = helpers.dbMonWithChat();

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.html',
})
export class App {
  protected readonly db = signal(new Map<string, DBRow>());
  protected readonly chats = signal<ChatMessage[]>([]);
  protected readonly rows = computed(() => Array.from(this.db().values()));

  constructor() {
    afterNextRender(() => {
      test.doit({
        handleDbUpdate: (eventData: DBUpdate) => {
          this.db.update((prev) => {
            const next = new Map(prev);
            for (const d of eventData.data) {
              next.set(d.dbname, d);
            }
            return next;
          });
        },
        handleChat: (eventData: ChatUpdate) => {
          this.chats.update((prev) => {
            const next = prev.concat(eventData.data);
            return next.length > 12 ? next.slice(next.length - 12) : next;
          });
        },
      });
    });
  }
}
