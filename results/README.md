# results

Two things live here:

- **the recorded data**: `public/results/*.json` (official runs, numbered
  sequentially) and `public/experiments/*.json` (one-off runs, e.g. from
  `pnpm use-tar-for`). These files are written by the runner in
  `../src/runner/` -- their shape is described by `ResultSet` in
  [`app/types.ts`](./app/types.ts).
- **the viewer**: an Ember app that renders those files -- the tables,
  boxplots, animated view, and run-to-run compare.

## Running the viewer

```bash
cd results
pnpm install
pnpm start
```

`pnpm build` produces the production build, `pnpm lint:types` type-checks.

## Where things are

| path | what it is |
| --- | --- |
| `app/types.ts` | the shape of a result file -- the contract with the runner |
| `app/utils.ts` | formatting, query-param readers, statistics |
| `app/frameworks.ts` | the framework registry (display name, color, logo, package to read the version from) -- shared with the runner |
| `app/templates/results/` | the three views of one run: table, boxplot, animated |
| `app/templates/compare.gts` | one framework across N runs |
| `vite.config.mjs` | builds `virtual:result-sets`: the list of runs and the build-time metadata (date, browser, throttle) their display names are made of |

Result files are fetched at runtime by name; nothing needs rebuilding when
a new JSON lands in `public/results/`.
