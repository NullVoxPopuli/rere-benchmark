# common

The shared bench harness. Every app in `frameworks/<framework>/<bench>/`
depends on this package (via `link:../../../common`), so all frameworks run
**the same workload, verification, and measurement code** -- the only thing
a framework app supplies is the rendering.

What's here:

- `src/tests/` -- one driver per bench (`one-item`, `many-items`, `fan-out`,
  `incrementing-render-effect`, `db-mon-with-chat`), all built on
  `base-test.js`. A driver reads its workload from query params (seeded, so
  every framework gets byte-identical work), calls the app back to perform
  each update, verifies the final DOM, and emits the `:start` / `:done`
  performance marks the runner records.
- `src/fps.js` -- the sliding-window FPS meter the dbmon bench samples.
- `src/tests/dbmon/` -- the web workers (db mutations, chat) that drive the
  dbmon bench off the main thread.

An app uses it like:

```js
import { helpers } from 'common';

const test = helpers.fanOut();
test.doit((value) => {
  /* render `value` however the framework renders */
});
```

Because the apps link this package, `pnpm install` must run *here* before
the apps build -- the runner does that automatically (pnpm does not install
dependencies of linked packages).
