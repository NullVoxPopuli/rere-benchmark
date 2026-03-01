/**
 * MIT
 * https://www.npmx.dev/package/tiny-fps
 *
 * Changes:
 * - averages over 1s and 5s, rather than since last frame
 * - precision displayed to 1 decimal place instead of 6
 * - padding to 5 characters to prevent jitter
 */

const ms_1s = 1000;
const ms_5s = 5000;

export function get5sAverage() {
  let fps = document.getElementById('fps');

  if (!fps) {
    throw new Error(`FPS was not rendered. First call setupFPS()`);
  }

  let content = fps.textContent;
  let lines = content.split('\n');
  let relevantLine = lines.find((line) => line.includes('5s avg '));

  if (!relevantLine) {
    throw new Error(`Could not find 5s avg in the FPS element`);
  }

  let valueStr = relevantLine.replace('5s avg', '').trim();
  let value = parseFloat(valueStr);

  return value;
}

/**
 * Compute the average FPS over the last `windowMs` milliseconds
 * from a sorted array of frame timestamps.
 *
 * @param {number[]} frameTimes
 * @param {number} windowMs
 * @param {number} fallback
 * @returns {number}
 */
function rollingAvg(frameTimes, windowMs, fallback) {
  const now = frameTimes[frameTimes.length - 1];
  if (now === undefined) return fallback;

  const cutoff = now - windowMs;
  let start = 0;
  while (
    start < frameTimes.length &&
    /** @type {number} */ (frameTimes[start]) < cutoff
  ) {
    start++;
  }

  const count = frameTimes.length - start;
  if (count < 2) return fallback;

  const duration = now - /** @type {number} */ (frameTimes[start]);
  return duration > 0 ? (count - 1) / (duration / ms_1s) : fallback;
}

export function setupFPS() {
  // create element
  const el = document.createElement('div');
  el.id = 'fps';
  el.style.whiteSpace = 'pre-wrap';
  el.style.fontFamily = 'monospace';
  el.style.fontSize = '11px';
  el.style.position = 'fixed';
  el.style.right = '6px';
  el.style.bottom = '6px';
  el.style.width = 'auto';
  el.style.height = 'auto';
  document.body.appendChild(el);

  /** @type {number[]} */
  const frameTimes = [];
  /** @type {number | undefined} */
  let prevTime;
  /** @type {number | undefined} */
  let lastRender;

  const update = (/** @type {number | undefined} */ time) => {
    window.requestAnimationFrame(update);
    if (time === undefined) return;

    frameTimes.push(time);

    // keep only the last 5 seconds of frames
    const cutoff = time - ms_5s;
    while (
      frameTimes.length > 0 &&
      /** @type {number} */ (frameTimes[0]) < cutoff
    ) {
      frameTimes.shift();
    }

    const fps = prevTime !== undefined ? ms_1s / (time - prevTime) : 0;

    if (lastRender === undefined || time - lastRender >= 50) {
      const avg1s = rollingAvg(frameTimes, ms_1s, fps);
      const avg5s = rollingAvg(frameTimes, ms_5s, fps);

      el.textContent =
        'fps    ' +
        fps.toFixed(1).padStart(5) +
        '\n' +
        '1s avg ' +
        avg1s.toFixed(1).padStart(5) +
        '\n' +
        '5s avg ' +
        avg5s.toFixed(1).padStart(5);
      lastRender = time;
    }

    prevTime = time;
  };

  // begin
  update(undefined);
}
