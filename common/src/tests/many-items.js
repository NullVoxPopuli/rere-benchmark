import { BaseTest, RUN } from './base-test.js';
import {
  qpBool,
  qpNum,
  qpPercent,
  seededRandom,
  tryVerify,
  yieldKind,
  yieldTo,
} from './utils.js';

/**
 * @typedef {import('./types.ts').BenchTest<Array<number | undefined>>} ArrayTest
 *
 * @extends {BaseTest<(index: number) => unknown>}
 * @implements {ArrayTest}
 */
export class ManyItems extends BaseTest {
  name = '10k items, 1 update';

  #num = qpNum('items', 10_000) ?? 10_000;
  #totalUpdates = 0;
  #random;
  #updateCount = 0;

  /**
   * Which indices were written to, for the random variants. The sequential
   * ones are exactly `i < #totalUpdates` and need no bookkeeping, which is
   * what keeps this off the hot path: the random benches update at most a
   * few hundred items, the high-count benches are all sequential.
   *
   * @type {Set<number> | undefined}
   */
  #updated;

  /**
   * @type {string | undefined}
   */
  #expected;

  /**
   * @type {number}
   */
  #percentRandomAwait = 0;

  /**
   * @type {'micro' | 'macro'}
   */
  #yieldKind = yieldKind();

  #rng = seededRandom();

  constructor({
    totalUpdates = qpNum('updates', 10_000),
    random = qpBool('random', false),
  } = {}) {
    super();

    this.#totalUpdates = totalUpdates ?? -1;
    this.#random = random;
    this.#updated = random ? new Set() : undefined;
    this.#percentRandomAwait = qpPercent('percentRandomAwait', 0);
  }

  getData = () => {
    return Array(this.#num).fill(undefined);
  };

  /**
   * We format so we can easily query the DOM for an item.
   * Using the square brackets, [,], we ensure that items
   * running in to each other can still uniquely be .include() checked.
   *
   * `undefined` is what an item that has not been updated yet renders as --
   * `getData` fills the list with it -- so it is part of the signature.
   *
   * @param {number | undefined} item
   */
  formatItem(item) {
    return `[${item}]`;
  }

  /**
   * Whether index `i` should be showing its own value by now.
   *
   * @param {number} i
   */
  #wasUpdated(i) {
    return this.#updated ? this.#updated.has(i) : i < this.#totalUpdates;
  }

  /**
   * Every item in the state the run should have left it in, as one string.
   */
  #expectedText() {
    let text = '';

    for (let i = 0; i < this.#num; i++) {
      text += this.formatItem(this.#wasUpdated(i) ? i : undefined);
    }

    return text;
  }

  verify = () => {
    if (this.#updateCount !== this.#totalUpdates) return false;

    // The whole list, not just the last item written.
    //
    // This used to ask whether `[#last]` appeared anywhere in the document,
    // which proves that *one* item rendered. A framework part-way through
    // flushing satisfies that, so a run could be called done with earlier
    // updates still pending -- and on the random variants `#last` is an
    // arbitrary index that may well have been rendered long before the end,
    // so the check was close to free to pass.
    //
    // Compared as a substring rather than for equality so that app chrome
    // around the list does not matter, and whitespace-stripped because some
    // templates space their items out and some do not.
    this.#expected ??= this.#expectedText();

    let rendered = document.body.textContent?.replace(/\s+/g, '') ?? '';

    return rendered.includes(this.#expected);
  };

  #randomNextValue = () => {
    return Math.floor(this.#rng() * this.#num);
  };

  /**
   * @override
   *
   * @param {(nextValue: number) => unknown} set
   */
  async [RUN](set) {
    let name = this.name;

    performance.mark(`:start`);

    for (let i = 0; i < this.#totalUpdates; i++) {
      if (this.#percentRandomAwait > 0) {
        if (
          this.#percentRandomAwait < 1 ||
          this.#rng() < this.#percentRandomAwait
        ) {
          await yieldTo(this.#yieldKind);
        }
      }

      let nextValue = this.#random ? this.#randomNextValue() : i;

      set(nextValue);
      this.#updateCount++;
      this.#updated?.add(nextValue);
    }

    tryVerify(name, this.verify);
  }
}
