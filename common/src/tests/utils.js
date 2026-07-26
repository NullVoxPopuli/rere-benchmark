/**
 * How long to wait for the DOM to catch up before calling the run broken.
 * The runner gives up at 60s; failing first means the failure says what
 * actually went wrong instead of arriving as an empty result.
 */
const SETTLE_TIMEOUT_MS = 30_000;

/**
 * Stamp `:done` as soon as the DOM reflects the finished state.
 *
 * Two things used to sit between "the DOM is correct" and the mark:
 *
 * 1. `console.timeEnd(label)` ran *before* `performance.mark(':done')`.
 *    With a debugger attached every console call is serialized and shipped
 *    over the protocol, so an unknown number of milliseconds of devtools
 *    I/O landed inside the measurement. The mark goes first now, and the
 *    log is built from the marks afterwards.
 *
 * 2. When the framework had not rendered yet, `check` was retried from a
 *    `requestIdleCallback`, so `:done` carried however long the idle
 *    scheduler took to hand back a slot. That is not framework work.
 *
 * A MutationObserver callback is a microtask that runs at the end of
 * whichever task touched the DOM, so we re-check the moment a framework
 * renders -- whatever it schedules rendering on, and without waiting for a
 * frame. Measured on `1 item, 1k updates` at 4x throttle, 6 runs, same
 * machine, before and after:
 *
 *              median      range              median     range
 *     ember      7.65   6.1 - 13.2   ->         5.45   4.4 - 7.8
 *     vue        10.8   9.7 - 12.5   ->         6.65   5.7 - 8.5
 *     react      17.0   12.8 - 30.7  ->        12.85   9.8 - 15.5
 *
 * One of those six vue runs never produced `:done` at all beforehand --
 * the idle callback that never fires, which the `{ timeout: 50 }` in #46
 * was papering over.
 *
 * The rAF loop alongside the observer is a backstop for anything that
 * could satisfy `check` without mutating (nothing does today), so a miss
 * shows up as a slightly late `:done` rather than a hang.
 *
 * @param {string} label
 * @param {() => boolean} check
 */
export function tryVerify(label, check) {
  let checks = 0;
  let done = false;

  /**
   * @param {'immediate' | 'mutation' | 'frame'} via
   */
  const finish = (via) => {
    if (done) return;
    done = true;

    observer.disconnect();
    clearTimeout(timeout);

    performance.mark(`:done`, { detail: { checks, via } });

    const [start] = performance.getEntriesByName(`:start`);
    const [end] = performance.getEntriesByName(`:done`);

    if (start && end) {
      console.log(
        `${label}: ${(end.startTime - start.startTime).toFixed(2)}ms ` +
          `(settled via ${via} after ${checks} check${checks === 1 ? '' : 's'})`,
      );
    }
  };

  /**
   * @param {'immediate' | 'mutation' | 'frame'} via
   */
  const attempt = (via) => {
    if (done) return;

    checks++;

    if (check()) finish(via);
  };

  const observer = new MutationObserver(() => attempt('mutation'));

  const timeout = setTimeout(() => {
    if (done) return;

    observer.disconnect();

    throw new Error(
      `${label}: the DOM never reached the verified state, ` +
        `after ${checks} checks over ${SETTLE_TIMEOUT_MS}ms`,
    );
  }, SETTLE_TIMEOUT_MS);

  const nextFrame = () => {
    if (done) return;

    attempt('frame');
    requestAnimationFrame(nextFrame);
  };

  // Already correct: the framework rendered synchronously with the writes,
  // so there is nothing to wait for and nothing to add to the measurement.
  attempt('immediate');

  if (done) return;

  // childList and characterData are how a rendered value reaches the
  // screen -- a replaced text node or a rewritten one. Attributes are left
  // out on purpose: no bench verifies one, and observing them would record
  // (and allocate) for every class change dbmon makes.
  observer.observe(document, {
    subtree: true,
    childList: true,
    characterData: true,
  });

  requestAnimationFrame(nextFrame);
}

const macrotaskChannel = new MessageChannel();

/**
 * Resolves in a new macrotask, without setTimeout's clamping.
 *
 * This is how socket messages arrive: each one is its own task,
 * not a microtask -- so frameworks get a chance to render between them.
 */
export function nextMacrotask() {
  return new Promise((resolve) => {
    macrotaskChannel.port1.onmessage = () => resolve(undefined);
    macrotaskChannel.port2.postMessage(null);
  });
}

/**
 * How the update loops hand control back between updates.
 *
 * `micro` is `await 0`: one turn of the microtask queue. Frameworks that
 * flush on a microtask get to render between updates; anything scheduled
 * on a task, a frame, or an idle callback does not, because the microtask
 * queue is drained before the browser looks at any of those. That is a
 * real and interesting thing to measure, but it is *not* what "async" means
 * to most readers, and it is not how data actually arrives over a socket.
 *
 * `macro` is a real task, the same MessageChannel hop fan-out uses, which
 * is how a `websocket.on('message')` handler is actually reached.
 *
 * `micro` stays the default: it is what every recorded run so far used, and
 * a real task per update would put the 100k-update variants into the
 * minutes.
 *
 * @returns {'micro' | 'macro'}
 */
export function yieldKind() {
  return qp('yield') === 'macro' ? 'macro' : 'micro';
}

/**
 * One turn of whichever queue {@link yieldKind} selects.
 *
 * @param {'micro' | 'macro'} kind
 */
export function yieldTo(kind) {
  return kind === 'macro' ? nextMacrotask() : Promise.resolve();
}

/**
 * Changing this changes every workload, so runs recorded either side of it
 * are not comparable. Override per run with `?seed=`.
 */
export const DEFAULT_SEED = 1;

/**
 * A seeded stand-in for `Math.random`.
 *
 * The benches lean on randomness in a lot of places -- which items a random
 * variant updates, which rows dbmon mutates and what it puts in them, how
 * long each worker sleeps, what text faker generates. All of it came from
 * `Math.random`, so every framework was measured against a *different*
 * workload, and so was every run of the same framework. Seeding it means
 * every framework does identical work, and a suspicious result can be
 * reproduced instead of re-rolled.
 *
 * The algorithm is mulberry32, by Tommy Ettinger, copied verbatim from
 * bryc's collection of seedable PRNGs (public domain):
 * https://github.com/bryc/code/blob/master/jshash/PRNGs.md#mulberry32
 * That page also covers how it works and how it compares to alternatives.
 * Tiny, fast, and good enough for picking indices and delays.
 *
 * Each caller gets its own stream so that adding a call site in one place
 * does not shift the sequence everywhere else.
 *
 * @param {number} [seed]
 * @returns {() => number}
 */
export function seededRandom(seed = qpNum('seed', DEFAULT_SEED)) {
  let a = seed >>> 0;

  return function random() {
    a = (a + 0x6d2b79f5) | 0;

    let t = Math.imul(a ^ (a >>> 15), 1 | a);

    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const state = Symbol.for('worker:state');

export function globalState() {
  /** @type {any} */ (globalThis)[state] ??= {};

  return /** @type {any} */ (globalThis)[state];
}

/**
 * @param {string} name
 */
export function qp(name) {
  // A worker has a `location`, but it is the worker script's own URL and its
  // search is the empty string -- which `??` does not fall through, so the
  // search the page forwarded on startup was never consulted and no query
  // param has ever reached a worker. `||` falls through to it.
  let search = globalThis.location?.search || globalState()?.search || '';

  let query = new URLSearchParams(search);

  return query.get(name);
}

/**
 * @overload
 * @param {string} name
 * @param {number} fallback
 * @returns {number}
 */
/**
 * @overload
 * @param {string} name
 * @param {undefined} [fallback]
 * @returns {number | undefined}
 */
/**
 * @param {string} name
 * @param {number} [fallback]
 */
export function qpNum(name, fallback) {
  let q = qp(name);

  if (q === null || q === undefined) return fallback;

  let r = parseInt(q, 10) || fallback;

  return r;
}

/**
 * Reads percent (0-100), returns percent (0-1)
 *
 * @param {string} name
 * @param {number} fallback
 */
export function qpPercent(name, fallback) {
  let num = qpNum(name);

  return num !== undefined ? num / 100 : fallback;
}

/**
 * @param {string} name
 * @param {boolean} fallback
 */
export function qpBool(name, fallback) {
  let q = qp(name);

  if (!q) return fallback;

  if (q === 'true' || q === '1') return true;

  return false;
}
