import { BaseTest, RUN } from './base-test.js';
const dbWorker = new Worker(new URL('./dbmon/db-worker.js', import.meta.url), {
  name: 'DB Monitor',
  type: 'module',
});

const chatWorker = new Worker(
  new URL('./dbmon/chat-worker.js', import.meta.url),
  {
    name: 'Live Chat',
    type: 'module',
  },
);

/**
 * @typedef {import('./dbmon/types.ts').Row} DBRow;
 *
 * @typedef {{ db: DBRow[], chats: ChatMessage[] }} Data
 * @typedef {() => Data} GetData
 *
 * @typedef {import('./types.ts').BenchTest<Data>} DataTest
 *'t
 * @implements {DataTest}
 */
export class DBMonWithChat extends BaseTest {
  getData() {
    return {
      db: [],
      chats: [],
    };
  }

  /**
   * @override
   *
   * @typedef {object} Options
   * @property {(...args: unknown[]) => unknown} handleDbUpdate
   * @property {(...args: unknown[]) => unknown} handleChat
   */
  doit({ handleDbUpdate, handleChat }) {
    this.prepare(() => {
      this.run({ updateDB: handleDbUpdate, addChat: handleChat });
    });
  }

  /**
   * Type in the chat, send messages,
   * TODO: find a way to measure lagginess
   */
  verify() {
    // this may be tricky
    return true;
  }

  /**
   * @override
   *
   * TODO: start dbmon
   * TODO: start chat window
   *
   * @param {(...args: unknown[]) => unknown} updateDB
   * @param {(...args: unknown[]) => unknown} addChat
   */
  [RUN]({ updateDB, addChat }) {
    dbWorker.addEventListener('message', (event) => {
      updateDB(event.data);
    });
    chatWorker.addEventListener('message', (event) => {
      addChat(event.data);
    });

    dbWorker.postMessage(
      JSON.stringify({
        action: 'start',
        search: window.location.search,
      }),
    );

    chatWorker.postMessage(
      JSON.stringify({
        action: 'start',
        search: window.location.search,
      }),
    );
  }
}
