import { BaseTest, RUN } from './base-test.js';
import { setupFPS, get5sAverage } from '../fps.js';
import { tryVerify } from './utils.js';

const ms_5s = 5_000;

/**
 * @typedef {import('./dbmon/types.ts').Row} DBRow;
 * @typedef {import('./dbmon/types.ts').ChatMessage} ChatMessage;
 *
 * @typedef {{ db: DBRow[], chats: ChatMessage[] }} Data
 * @typedef {() => Data} GetData
 *
 * @typedef {import('./types.ts').BenchTest<Data>} DataTest
 *'t
 * @implements {DataTest}
 */
export class DBMonWithChat extends BaseTest {
  name = `DB Monitor w/ chat simulator`;

  getData() {
    return {
      db: [],
      chats: [],
    };
  }

  /**
   * @override
   *
   * @param {object} options
   * @param {(...args: unknown[]) => unknown} options.handleDbUpdate
   * @param {(...args: unknown[]) => unknown} options.handleChat
   */
  doit({ handleDbUpdate, handleChat }) {
    this.prepare(() => {
      this.run({ updateDB: handleDbUpdate, addChat: handleChat });
    });
  }

  #receivedDb = false;
  #receivedChat = false;
  #startedAt = 0;
  #averages = [];

  check = () => {
    return this.#averages.length === 4;
  };

  collectFPSSlidingWindow = () => {
    if (!this.#receivedChat) return;
    if (!this.#receivedDb) return;
    if (this.#averages.length >= 4) return true;

    if (!this.#startedAt) {
      this.#startedAt = Date.now();
      return;
    }

    let now = Date.now();
    let bucketsOf5s = Math.floor((now - this.#startedAt) / ms_5s);

    if (bucketsOf5s === 0) return;

    if (bucketsOf5s && this.#averages.length === bucketsOf5s - 1) {
      let fps = get5sAverage();
      performance.mark('fps', { detail: fps });
      this.#averages.push(fps);

      if (bucketsOf5s >= 4) {
        tryVerify(this.name, this.check, 1);
      }
    }
  };

  /**
   *
   * @param {object} options
   * @param {(...args: unknown[]) => unknown} options.updateDB
   * @param {(...args: unknown[]) => unknown} options.addChat
   */
  [RUN]({ updateDB, addChat }) {
    performance.mark(`:start`);

    const dbWorker = new Worker(
      new URL('./dbmon/db-worker.js', import.meta.url),
      {
        name: 'DB Monitor',
        type: 'module',
      },
    );

    const chatWorker = new Worker(
      new URL('./dbmon/chat-worker.js', import.meta.url),
      {
        name: 'Live Chat',
        type: 'module',
      },
    );

    setupFPS();

    dbWorker.addEventListener('message', (event) => {
      updateDB(event.data);
      this.#receivedDb = true;
      this.collectFPSSlidingWindow();
    });
    chatWorker.addEventListener('message', (event) => {
      addChat(event.data);
      this.#receivedChat = true;
      this.collectFPSSlidingWindow();
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
