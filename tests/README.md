# app-tests

Playwright tests asserting that **every framework implementation of every
bench actually works**, so PRs can't silently break an app.

## What is covered

- every app (each framework x each bench), built and served like the bench
  runner serves them
  - benches that end (fan-out, one-item, ten-k, incrementing) self-verify
    their DOM via `tryVerify` in `common` — the tests wait for the `:done`
    performance mark and fail on any page error
  - dbmon runs forever, so the tests assert both data streams render and
    keep updating
- the dev server (`vite dev`, or `ng serve` for angular) for the dbmon
  apps: dev serves the linked `common` package's web workers via `/@fs`,
  which `server.fs.allow` can block — a failure mode production builds
  do not have

Workloads are shrunk via query params so the whole suite takes ~1 minute
(after builds).

## Conformance (anti-cheating)

`specs/conformance.spec.ts` checks that every framework is doing the
*same work*, not just finishing with the right answer.

The workload is shared and seeded, so every framework receives identical
writes. In the default sync-loop mode frameworks legitimately coalesce
those writes differently -- that difference is part of what the benchmark
measures. But when the workload yields a full task between writes
(`yield=macro&percentRandomAwait=100`, `burstSize=1` for fan-out), there
is nothing left to coalesce: the sequence of rendered DOM states is fully
determined by the workload, and must be identical for every framework.

A `MutationObserver` installed before any app code records what happens
between `:start` and `:done`, and the tests assert:

- the page passes through **exactly** the expected sequence of states --
  no skipped, repeated, out-of-order, or pre-/post-measurement rendering
- **no elements** are created or destroyed during the run (structure is
  static in every bench; only text changes)
- text-node churn stays within a small per-update budget: in-place
  `nodeValue` writes count 0, a text-node swap counts 2, while rebuilding
  a list subtree on every update is O(items) and fails

dbmon-with-chat is excluded: it runs forever off worker-driven timing,
so there is no deterministic finite trace to compare.

## Running

```bash
cd tests
pnpm install
pnpm exec playwright install chromium

pnpm test              # installs + builds all apps first
SKIP_BUILD=1 pnpm test # reuse existing dists (fast local iteration)

# conformance suite (opt-in)
CONFORMANCE=1 SKIP_BUILD=1 pnpm test specs/conformance.spec.ts
```
