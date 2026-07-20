import { BaseTest, RUN } from './base-test.js';
import { nextMacrotask, qpNum, tryVerify } from './utils.js';

/**
 * One value, rendered in many places.
 *
 * Think: a live exchange rate, "users online" count, or shared cursor
 * position that appears all over a dashboard. The data arrives in bursts,
 * because that's what sockets do -- one `message` event (a macrotask)
 * can carry many ticks, and only the last one needs to hit the DOM.
 *
 * This stresses:
 * - the cost of *writing* to the reactive system
 *   (pull-based systems bump a revision; push-based systems have to
 *   visit every subscriber on every write)
 * - the ability to coalesce a burst of writes into one render
 * - the cost of updating many consumers of the same value per render
 *
 * @typedef {import('./types.ts').BenchTest<number>} NumberTest
 *
 * @implements {NumberTest}
 */
export class FanOut extends BaseTest {
  /**
   * @type {string}
   */
  name;

  /**
   * @type {number}
   */
  #consumers;

  /**
   * @type {number}
   */
  #updates;

  /**
   * @type {number}
   */
  #burstSize;

  #updateCount = 0;

  /**
   * @type {number | undefined}
   */
  #last;

  /**
   * @type {number[]}
   */
  #range;

  constructor({
    consumers = qpNum('consumers', 1_000),
    updates = qpNum('updates', 10_000),
    burstSize = qpNum('burstSize', 100),
  } = {}) {
    super();

    this.#consumers = consumers;
    this.#updates = updates;
    this.#burstSize = burstSize;
    this.#range = Array.from({ length: consumers }, (_, i) => i);
    this.name = `1 value, ${consumers} consumers, ${updates / 1000}k updates (bursts of ${burstSize})`;
  }

  /**
   * The static list that each app iterates to render the consumers.
   * This never changes -- only the value does.
   *
   * @return {number[]}
   */
  get consumerRange() {
    return this.#range;
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
    let spans = document.querySelectorAll('output > span');

    if (this.#updateCount !== this.#updates) return false;
    if (spans.length !== this.#consumers) return false;

    let expected = this.formatItem(this.#last ?? -1);

    // every consumer must show the final value --
    // partially-updated DOM does not count as done.
    for (let span of spans) {
      if (span.textContent?.trim() !== expected) return false;
    }

    return true;
  };

  /**
   * @override
   *
   * @param {(nextValue: number) => unknown} set
   */
  async [RUN](set) {
    let name = this.name;

    console.time(name);
    performance.mark(`:start`);

    let value = 0;

    while (this.#updateCount < this.#updates) {
      let burstEnd = Math.min(
        this.#updateCount + this.#burstSize,
        this.#updates,
      );

      // One socket message: a synchronous burst of ticks.
      while (this.#updateCount < burstEnd) {
        set(++value);
        this.#updateCount++;
      }

      this.#last = value;

      // The next message arrives as a new (macro)task,
      // like a real `websocket.on('message', ...)` would.
      await nextMacrotask();
    }

    tryVerify(name, this.verify);
  }
}
