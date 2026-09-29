# Marko

Creating new benches

There is no client-only Vite template for Marko, so the apps here are
hand-rolled: a plain Vite `index.html` entry pointing at `src/main.js`,
which mounts `src/App.marko` with the template's `.mount()` API, and
`@marko/vite` with `linked: false` (linked mode is for SSR entrypoints).

Copy an existing bench app and replace `src/App.marko`.

Notes:

- These are Marko 6 apps (the tags API): `<let>` for state, `<for>` for
  lists, and `<lifecycle onMount>` for run-once setup. Reactivity is
  per-assignment -- mutating an array or Map in place does not update, so
  the benches reassign (or, for `ten-k-items-one-time`, give every item
  its own `<let>` in a child tag).
- In concise mode (the default at a template's root), a bare `${...}`
  line parses as a dynamic tag *name*; root-level text needs the `--`
  text prefix (see `ten-k-items-one-time`'s `tags/bench-item.marko`).
- Attribute method shorthands that close over `<for>` loop variables and
  get passed to a custom tag can compile to a hoisted function that
  loses the loop scope (`$scope is not defined` at runtime). Passing a
  `static` function plus the index as separate attributes avoids it.
- Marko's update scheduler has a frame-rate floor (`schedule()` in
  marko's `src/dom/schedule.ts`): the first write in a frame renders in
  a microtask, every later write waits for the next animation frame.
  Bursts coalesce to one render per frame. Do not force `run()` (from
  `marko/dom`) into the apps to change this. That measures manual
  flushing instead of Marko. The conformance suite paces its writes with
  `yield=frame` for marko instead (see `FRAME_THROTTLED` in
  `tests/specs/conformance.spec.ts`), so the anti-cheat trace assertions
  still fully apply.
- There is no `incrementing-render-effect` app, because Marko does not
  support effects. `notes.json` declares the skip, so the runner and the
  tests leave it out, and the results app shows the reason.
