import { qpBool, qpNum, tryVerify } from './utils.js';

/**
 * @typedef {import('./types.ts').BenchTest<Array<number | undefined>>} ArrayTest
 *
 * @implements {ArrayTest}
 */
export class TenKItems {
  name = '10k items, 1 update';

  #num = qpNum('items', 10_000);
  #totalUpdates;
  #random;
  /**
   * @type {number | undefined}
   */
  #last;

  /**
   * @type {boolean}
   */
  #allowManualBatch = false;

  constructor({
    totalUpdates = qpNum('updates', 10_000),
    random = qpBool('random', false),
  } = {}) {
    this.#totalUpdates = totalUpdates;
    this.#random = random;
    this.#allowManualBatch = qpBool('manualBatch', false);
  }

  getData = () => {
    return Array(this.#num).fill(undefined);
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
    let result = document.body.textContent?.trim() ?? '';

    return result.includes(`[${this.#last}]`);
  };

  #isRunning = false;

  #randomNextValue = () => {
    return Math.floor(Math.random() * this.#num);
  };

  /**
   * @param {(nextValue: number) => unknown} set
   * @param {(callback: () => unknown) => unknown} [ batch ] if a reactivity system requires manual, userland batching, pass that function here, it will wrap the test run
   */
  run(set, batch) {
    // Account for React's double-mount...
    //   (only occurs during dev mode tho)
    // Normally we'd hard error if this is called more than once.
    if (this.#isRunning) return;

    this.#isRunning = true;

    requestIdleCallback(() => {
      requestAnimationFrame(async () => {
        let name = this.name;

        const run = async () => {
          for (let i = 0; i < this.#totalUpdates; i++) {
            await 0;
            let nextValue = this.#random ? this.#randomNextValue() : i;
            set(nextValue);
            this.#last = nextValue;
          }
        };

        console.time(name);
        performance.mark(`:start`);

        if (batch && this.#allowManualBatch) {
          batch(() => run());
        } else {
          await run();
        }

        tryVerify(name, this.verify);
      });
    });
  }
}
