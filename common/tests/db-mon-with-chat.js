/**
 * @typedef {{ db: DB, chats: ChatMessage[] }} Data
 *
 * @typedef {import('./types.ts').BenchTest<Data>} DataTest
 *
 * @implements {DataTest}
 */
export class DBMonWithChat {
  getData() {
    return {
      db: null,
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
   */
  run() {
    throw new Error('Method not implemented.');
  }
}
