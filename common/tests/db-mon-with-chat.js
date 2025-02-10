import { ENV } from './dbmon/env.js';
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
  getData() {
    return {
      db: ENV.generateData().toArray(),
      chats: [],
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
    throw new Error('Method not implemented.');
  }
}
