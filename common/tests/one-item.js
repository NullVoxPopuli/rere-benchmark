import { qpNum, tryVerify } from './utils.js';

/**
 * @typedef {import('./types.ts').BenchTest<number>} NumberTest
 *
 * @implements {NumberTest}
 */
export class OneItem {
  /**
   * @type {string}
   */
  name;

  /**
   * @type {number}
   */
  #num;
  constructor(num = qpNum('updates', 10_000)) {
    this.#num = num;
    this.name = `1 Item, ${num / 1000}k updates`;
  }

  /**
   * @return {number}
   */
  getData = () => {
    return 0;
  };

  /**
   * We format so we can easily query the DOM for an item.
   * Using the square brackets, [,], we ensure that items
   * running in to each other can still uniquely be .include() checked.
   *
   * @param {number} item
   */
  formatItem(item) {
    return `[${item}]`;
  }

  verify = () => {
    let result = document.querySelector('output')?.textContent?.trim() ?? '';

    return result.includes(`[${this.#num - 1}]`);
  };

  #isRunning = false;

  /**
   * @param {(nextValue: number) => unknown} set
   * @param {(callback: () => unknown) => unknown} [ batch ] if a reactivity system requires manual, userland batching, pass that function here, it will wrap the test run
   * @return {unknown}
   */
  run(set, batch) {
    // Account for React's double-mount...
    //   (only occurs during dev mode tho)
    // Normally we'd hard error if this is called more than once.
    if (this.#isRunning) return;

    this.#isRunning = true;
    requestIdleCallback(() => {
      requestAnimationFrame(() => {
        let name = this.name;

        const run = () => {
          for (let i = 0; i < this.#num; i++) {
            set(i);
          }
        };

        console.time(name);
        performance.mark(`:start`);

        if (batch) {
          batch(() => run());
        } else {
          run();
        }

        tryVerify(name, this.verify);
      });
    });
  }
}
