import { BaseTest, RUN } from './base-test.js';
import { qpBool, qpNum, qpPercent, tryVerify } from './utils.js';

/**
 * @typedef {import('./types.ts').BenchTest<Array<number | undefined>>} ArrayTest
 *
 * @implements {ArrayTest}
 */
export class ManyItems extends BaseTest {
  name = '10k items, 1 update';

  #totalUpdates;
  #random;
  #updateCount = 0;

  /**
   * @type {number | undefined}
   */
  #last;

  constructor({
    totalUpdates = qpNum('updates', 10_000),
    random = qpBool('random', false),
  } = {}) {
    super();

    this.#totalUpdates = totalUpdates;
    this.#random = random;
  }

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

  /**
   * @param {{prepare: (initialData: number[]) => unknown,set: (nextValue: number) => unknown}} options
   */
  async [RUN]({ prepare, set }) {
    const worker = new Worker(
      new URL('./many-items/worker.js', import.meta.url),
      {
        name: 'Many Items Generator',
        type: 'module',
      },
    );

    let name = this.name;

    console.time(name);
    performance.mark(`:start`);

    worker.addEventListener('message', (event) => {
      if (event.data.when === 'initial') {
        prepare(event.data.data);
        return;
      }

      if (event.data.when === 'finish') {
        console.log('finish received');
        tryVerify(name, this.verify);
        return;
      }

      let nextValue = event.data;
      set(nextValue);
      this.#updateCount++;
      this.#last = nextValue;
    });

    worker.postMessage(
      JSON.stringify({
        action: 'start',
        search: window.location.search,
        options: {
          num: qpNum('items', 10_000),
          totalUpdates: this.#totalUpdates,
          random: this.#random,
          percentRandomAwait: qpPercent('percentRandomAwait', 0),
          allowManualBatch: qpBool('manualBatch', false),
        },
      }),
    );
  }
}
