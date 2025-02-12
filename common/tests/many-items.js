import { BaseTest, RUN } from './base-test.js';
import { qpBool, qpNum, qpPercent, tryVerify } from './utils.js';

/**
 * @typedef {import('./types.ts').BenchTest<Array<number | undefined>>} ArrayTest
 *
 * @implements {ArrayTest}
 */
export class ManyItems extends BaseTest {
  name = '10k items, 1 update';

  #num = qpNum('items', 10_000);
  #totalUpdates;
  #random;
  #updateCount = 0;

  /**
   * @type {number | undefined}
   */
  #last;
  /**
   * @type {number}
   */
  #percentRandomAwait = 0;

  /**
   * @type {boolean}
   */
  #allowManualBatch = false;

  constructor({
    totalUpdates = qpNum('updates', 10_000),
    random = qpBool('random', false),
  } = {}) {
    super();

    this.#totalUpdates = totalUpdates;
    this.#random = random;
    this.#percentRandomAwait = qpPercent('percentRandomAwait', 0);
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

    let didRunEverything = this.#updateCount === this.#totalUpdates;
    let hasCorrectDOM = result.includes(`[${this.#last}]`);

    return didRunEverything && hasCorrectDOM;
  };

  #randomNextValue = () => {
    return Math.floor(Math.random() * this.#num);
  };

  /**
   * @param {(nextValue: number) => unknown} set
   */
  async [RUN](set) {
    let name = this.name;

    console.time(name);
    performance.mark(`:start`);

    for (let i = 0; i < this.#totalUpdates; i++) {
      if (this.#percentRandomAwait > 0) {
        if (
          this.#percentRandomAwait < 1 ||
          Math.random() < this.#percentRandomAwait
        ) {
          await 0;
        }
      }

      let nextValue = this.#random ? this.#randomNextValue() : i;
      set(nextValue);
      this.#updateCount++;
      this.#last = nextValue;
    }

    tryVerify(name, this.verify);
  }
}
