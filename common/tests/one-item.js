import { qpNum, tryVerify } from './utils.js';

export class OneItem {
  name = '1 Item, 10k updates';

  /**
   * @type {number}
   */
  #num;
  constructor(num = qpNum('updates', 10_000)) {
    this.#num = num;
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
   * @return {unknown}
   */
  run(set) {
    // Account for React's double-mount...
    //   (only occurs during dev mode tho)
    // Normally we'd hard error if this is called more than once.
    if (this.#isRunning) return;

    this.#isRunning = true;
    requestIdleCallback(() => {
      requestAnimationFrame(() => {
        let name = this.name;

        console.time(name);
        performance.mark(`:start`);

        for (let i = 0; i < this.#num; i++) {
          set(i);
        }

        tryVerify(name, this.verify);
      });
    });
  }
}
