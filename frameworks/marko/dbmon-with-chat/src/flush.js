import { run } from "marko/dom";

// Marko holds every write after the first in a frame until the next
// animation frame. The other frameworks here render every write, so the
// Marko apps flush on a microtask the same way.
let queued = false;

export function flushSoon() {
  if (queued) return;

  queued = true;
  queueMicrotask(() => {
    queued = false;
    run();
  });
}
