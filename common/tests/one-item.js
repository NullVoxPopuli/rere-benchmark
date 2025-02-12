import { qpBool, qpNum, qpPercent, tryVerify } from './utils.js';
import { RUN, BaseTest } from './base-test.js';

/**
 * @typedef {import('./types.ts').BenchTest<number>} NumberTest
 *
 * @implements {NumberTest}
 */
export class OneItem extends BaseTest {
  /**
   * @type {string}
   */
  name;

  /**
   * @type {number}
   */
  #percentRandomAwait = 0;

  /**
   * @type {boolean}
   */
  #allowManualBatch = false;

  /**
   * @type {number}
   */
  #num;

  constructor(num = qpNum('updates', 10_000)) {
    super();

    this.#num = num;
    this.name = `1 Item, ${num / 1000}k updates`;
    this.#percentRandomAwait = qpPercent('percentRandomAwait', 0);
    this.#allowManualBatch = qpBool('manualBatch', false);
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

  /**
   * .run() is in teh base class, and just calls this function.
   * (after making sure it can run twice)
   *
   * @param {(nextValue: number) => unknown} set
   */
  async [RUN](set) {
    let name = this.name;

    console.time(name);
    performance.mark(`:start`);

    for (let i = 0; i < this.#num; i++) {
      if (Math.random() < this.#percentRandomAwait) {
        await 0;
      }
      set(i);
    }

    tryVerify(name, this.verify);
  }
}
