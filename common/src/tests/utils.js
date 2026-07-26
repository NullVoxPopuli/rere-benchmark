/**
 * If using requestAnimationFrame:
 *
 * 960 frames:
 * - 16s @ 60fps
 * - 4s @ 240fps
 *
 * 480 frames:
 * - 8s @ 60fps
 * - 2s @ 240fps
 *
 * 120 frames:
 * - 2s @ 60fps
 * - 0.5s @ 240fps
 */
const NUM_FRAMES_TO_WAIT = 960;

/**
 * TODO?: also have a second-based timeout?
 *
 * @param {string} label
 * @param {() => boolean} check
 */
export function tryVerify(label, check, attempts = 0) {
  if (check()) {
    console.timeEnd(label);
    performance.mark(`:done`);
    console.log(`Rendered in ${attempts} frames`);
    return;
  }

  if (attempts < NUM_FRAMES_TO_WAIT) {
    // The timeout keeps the retry loop honest in two ways: a fully idle
    // page can starve requestIdleCallback entirely (the arm-but-never-fire
    // failure #34 fixed in base-test), and unbounded idle-grant latency
    // taxes frameworks that defer rendering past the dirtying task by
    // hundreds of ms of pure measurement noise on `:done`.
    requestIdleCallback(
      () => {
        tryVerify(label, check, attempts + 1);
      },
      { timeout: 50 },
    );
    return;
  }

  throw new Error(
    `Could not determine verified state within ${attempts} frames`,
  );
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
