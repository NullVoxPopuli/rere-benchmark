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

// TODO?: also have a second-based timeout?

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
