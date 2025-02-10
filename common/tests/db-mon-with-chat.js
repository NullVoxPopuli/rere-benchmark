import { generateData } from './dbmon/env.js';
/**
 * @typedef {import('./dbmon/types.ts').Row} DBRow;
 *
 * @typedef {{ db: DBRow[], chats: ChatMessage[] }} Data
 * @typedef {() => Data} GetData
 *
 * @typedef {import('./types.ts').BenchTest<Data>} DataTest
 *
 * @implements {DataTest}
 */
export class DBMonWithChat {
  #db = generateData();
  getData() {
    return {
      db: this.#db.toArray(),
      chats: [],
      update: this.#db.updateData,
    };
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
   * TODO: start dbmon
   * TODO: start chat window
   *
   * @param {GetData} getData
   */
  run(updateDB, addChat) {
    let loop = () => {
      this.#db.updateData(updateDB);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}
