import { BaseTest, RUN } from './base-test.js';
import { qpNum, tryVerify } from './utils.js';

export class IncrementingRenderEffect extends BaseTest {
  name = `Incrementing Render Effect`;

  #num = qpNum('updates', 100_000);

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
   * @param {() => number} options.get
   * @param {(num: number) => void} options.set
   * @param {(fn: () => void) => void} options.setupAdvancer
   */
  doit({ get, set, setupAdvancer, element }) {
    // Entangle!
    get();

    this.prepare(() => {
      this.run({ get, set, setupAdvancer, element });
    });
  }

  verify = () => {
    let result = document.querySelector('output')?.textContent?.trim() ?? '';

    return result === String(this.#num);
  };

  /**
   * @override
   *
   * @param {object} options
   * @param {() => number} options.get
   * @param {(num: number) => void} options.set
   * @param {(fn: () => void) => void} options.setupAdvancer
   */
  [RUN]({ get, set, setupAdvancer, element }) {
    let name = this.name;
    performance.mark(`:start`);

    let limit = this.#num;

    let last = 0;
    /**
     * This is sort of an infinite loop maker
     */
    setupAdvancer(async () => {
      // entangle auto-tracking
      let value = get();

      if (String(last) !== element.textContent) {
        throw new Error(`DOM is not in sync`);
      }

      if (value >= limit) {
        tryVerify(name, this.verify);
        return;
      }

      // detach from auto-tracking
      await Promise.resolve();

      last = value + 1;

      set(last);
    });

    // Begin!
    set(0);
  }
}
