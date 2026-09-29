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
- Marko renders the first write of a frame in a microtask, and holds
  every later write until the next animation frame (`schedule()` in
  Marko's `src/dom/schedule.ts`). The other frameworks here render every
  write. So after each write, every app calls `flushSoon()` from
  `src/flush.js`, which runs Marko's `run()` (from `marko/dom`) on a
  microtask. Without it, the conformance specs fail.
- In dev, the compiled templates use `marko/debug/dom`. The Vite config
  aliases `marko/dom` to it there, so `run()` flushes the same runtime.
- There is no `incrementing-render-effect` app, because Marko does not
  support effects. `notes.json` declares the skip, so the runner and the
  tests leave it out, and the results app shows the reason.
