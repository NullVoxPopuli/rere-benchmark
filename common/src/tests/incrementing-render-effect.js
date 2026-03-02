import { BaseTest, RUN } from './base-test.js';
import { tryVerify } from './utils.js';

export class IncrementingRenderEffect extends BaseTest {
  name = `Incrementing Render Effect`;

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
  doit({ get, set, setupAdvancer }) {
    // Entangle!
    get();

    this.prepare(() => {
      this.run({ get, set, setupAdvancer });
    });
  }

  verify = () => {
    let result = document.querySelector('output')?.textContent?.trim() ?? '';

    return result === '1000';
  };

  /**
   * @override
   *
   * @param {object} options
   * @param {() => number} options.get
   * @param {(num: number) => void} options.set
   * @param {(fn: () => void) => void} options.setupAdvancer
   */
  [RUN]({ get, set, setupAdvancer }) {
    let name = this.name;
    performance.mark(`:start`);

    let limit = 1000;

    /**
     * This is sort of an infinite loop maker
     */
    setupAdvancer(async () => {
      // entangle auto-tracking
      let value = get();

      if (value >= limit) {
        tryVerify(name, this.verify);
        return;
      }

      // detach from auto-tracking
      await Promise.resolve();

      set(value + 1);
    });

    // Begin!
    set(0);
  }
}
