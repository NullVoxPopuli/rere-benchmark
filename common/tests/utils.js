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
    requestIdleCallback(() => {
      tryVerify(label, check, attempts + 1);
    });
    return;
  }

  throw new Error(
    `Could not determine verified state within ${attempts} frames`,
  );
}

/**
 * @param {string} name
 */
export function qp(name) {
  let search = window.location.search;

  let query = new URLSearchParams(search);

  return query.get(name);
}

/**
 * @param {string} name
 * @param {number} fallback
 */
export function qpNum(name, fallback) {
  let q = qp(name);
  let r = q ? parseInt(q, 10) || fallback : fallback;
  return r;
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
