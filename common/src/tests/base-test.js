export const RUN = Symbol('__run__');
/**
 * Apologies to future developers
 * and, of course, to folks who hate
 * object oriented development.
 *
 * I don't want to make mistakes, and having shared
 * behavior in a base class is super useful.
 */
export class BaseTest {
  #isRunning = false;
  #isPreparing = false;

  /**
   * @abstract
   * @param {unknown} options
   * @return {unknown}
   */
  [RUN](options) {
    throw new Error('Not implemented');
  }

  /**
   * @param {unknown} updateCallback
   */
  doit(updateCallback) {
    this.prepare(() => {
      this.run(updateCallback);
    });
  }

  /**
   * @param {() => unknown} callback
   */
  prepare(callback) {
    // Account for React's double-mount...
    //   (only occurs during dev mode tho)
    // Normally we'd hard error if this is called more than once.
    if (this.#isPreparing) return;

    this.#isPreparing = true;
    requestAnimationFrame(() => {
      requestIdleCallback(() => {
        callback();
      });
    });
  }

  /**
   * @param {unknown} options
   * @return {unknown}
   */
  run(options) {
    // Account for React's double-mount...
    //   (only occurs during dev mode tho)
    // Normally we'd hard error if this is called more than once.
    if (this.#isRunning) return;

    this.#isRunning = true;

    // Don't let people await
    this[RUN](options);
  }
}
