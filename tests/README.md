# app-tests

Playwright tests asserting that **every framework implementation of every
bench actually works**, so PRs can't silently break an app.

## What is covered

- all 25 apps (5 frameworks x 5 benches), built and served like the bench
  runner serves them
  - benches that end (fan-out, one-item, ten-k, incrementing) self-verify
    their DOM via `tryVerify` in `common` — the tests wait for the `:done`
    performance mark and fail on any page error
  - dbmon runs forever, so the tests assert both data streams render and
    keep updating
- `vite dev` for the 5 dbmon apps: dev serves the linked `common`
  package's web workers via `/@fs`, which `server.fs.allow` can block —
  a failure mode production builds do not have

Workloads are shrunk via query params so the whole suite takes ~1 minute
(after builds).

## Running

```bash
cd tests
pnpm install
pnpm exec playwright install chromium

pnpm test              # installs + builds all apps first
SKIP_BUILD=1 pnpm test # reuse existing dists (fast local iteration)
```
