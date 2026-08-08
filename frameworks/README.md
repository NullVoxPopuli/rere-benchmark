# frameworks

One directory per framework, one **standalone app** per bench inside it:

```
frameworks/<framework>/<bench>/
```

The bench names must match across frameworks (`dbmon-with-chat`, `fan-out`,
`incrementing-render-effect`, `one-item-many-updates`,
`ten-k-items-one-time`) -- the runner pairs each bench in its catalog with
the app directory of that name for every framework.

## The contract for an app

- it installs with `pnpm install` and builds with `pnpm build` into `dist/`
  (that's what the runner runs and serves)
- it depends on `common` via `link:../../../common` and drives the bench
  through its helpers, so the workload and measurement are identical across
  frameworks -- the app only supplies the rendering
- apps are deliberately **not** part of a workspace: each has its own
  lockfile, so framework versions are isolated and `pnpm use-tar-for` can
  point one framework at a tarball without touching the others

Optional per-framework files:

- `README.md` -- how to scaffold a new bench app for this framework
- `notes.json` -- small labels recorded into a run, e.g. Vue's
  `{ "variant": "Vapor" }`, shown in the results app

## Adding a framework

See "Adding a new framework" in the [root README](../README.md): register
it in `results/app/frameworks.ts`, add a logo to `results/public/`, then
implement each bench here.
