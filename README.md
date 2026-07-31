# rere-benchmark

> [!NOTE]  
> This whole repo should be taken with a grain of salt right now. The benchmarks are still being developed. 


## TODOs

- Vanilla JS implementation

- create lints 
  - we don't want to prescribe pnpm vs npm vs yarn, so folks should provide an
    - install.sh and a build.sh?
    - config file? yaml? everyone loves yaml

- create ci check to comment back on the PR if the src/runner can't access the build:prod output
    - require that all apps in a framework folder have the same
      - install
      - build
      - framework version

-----------------------------------------


This is the Reactivity and Rendering Benchmark for frontend application and component frameworks.

- [Motivation](#motivation)
- [Methodology](#methodology)
  - [The Benchmarks](#the-benchmarks)
  - [Measuring "done"](#measuring-done)
  - [Reliability](#reliability)
- [Adding a new framework](#adding-a-new-framework)
- [Running the Benchmark](#running-the-benchmark)


## Motivation

I've felt that existing benchmarks don't exactly capture the things that _I_ care most about -- the ability to be fast once the app is booted. After all, the thing with single-page-apps is that you generally accept that there may be a higher up front cost, and then things are smooth sailing from there. 

The [JS Framework Benchmark](https://github.com/krausest/js-framework-benchmark) is the most notorious Frontend JS benchmark out there, but it focuses on boot time, memory, and generally some metrics similar to what [Page Speed Insights](https://pagespeed.web.dev/) focuses on. These are _good benchmarks_ for SEO, conversion, etc. 

There is also [JS Reactivity Benchmark](https://github.com/milomg/js-reactivity-benchmark), which aims to measure and stress a reactive system's ability to handle various sized and connected graphs of reactive data. However, this benchmark _requires_ the use of effects and does not represent a real world rendering-an-app situation, as you would build a web-based product with. 

_To be clear_, I think for what these benchmarks do, they do a good job. 

They just are not complete, and I'm mostly focused on apps: those with interactivity, rendering, representing live information, etc, 

How are we to measure all these post-boot behaviors?


> [!IMPORTANT]  
> **how effective each framework is _once booted_?**

That's where this benchmark comes in. 

We aren't measuring boot time right now, other benchmarks do that.

We are booting up an application, and then when that application is finished rendering, we start the benchmark test.


Additionally, 
monitors and screens are faster now, so there is a new minimum expected level of performance to achieve smooth updates.

> _**60fps rendering** is no longer the goal,_

**60fps rendering** is no longer the goal, but the minimum. Phones now have 120fps screens, and many desktop monitors have 240Hz refresh rates.

Prior assumptions that the human eye cannot detect above 100fps _were wrong_.


## Methodology

### The Benchmarks 

All benchmarks are quite synthetic, as they're intended to stress how efficient each framework is at handling rapid data change.

#### One item, many updates

This test is primarily about assessing the impact of dirtying the reactive system, and how the renderer can reconcile with many rapid updates.

It's kinda similar to having this in your app:
```js 
websocket.on('message', updateData);
```

Where you don't control the frequency of the updates, and they could happen at any speed. In this bench, we test if the message event is so fast, it's synchronous. And then measure the time it takes for the framework to render those changes.

#### 10k items, one update (variable) 

This test is covering a few things: iteration, ability to efficiently update one thing in the list without re-rendering the list, as well as the ability to handle a reactive collection, as is common in tables where you edit data.

It's kinda similar to having this in your app:
```js 
websocket.on('message', updateRow);
```

Where you don't control the frequency of the updates, and they could happen at any speed. In this bench, we test if the message event is so fast, it's synchronous. And then measure the time it takes for the framework to render those changes.

#### Incrementing render effect

Each render schedules the next update: the app renders a number, an effect
observes that render, and sets the number again. 100,000 times.

The DOM is checked every iteration, so a framework that falls behind fails
instead of getting a score.

#### One value, many consumers (fan out)

This test renders a single reactive value in many places at once, and then updates that value in bursts.

It's kinda similar to having this in your app:
```js 
websocket.on('message', (ticks) => ticks.forEach(updateSharedValue));
```

it is maybe emulating a live exchange rate, "users online" count, or shared cursor position that appears all over a dashboard. Each socket message (a macrotask) carries a burst of updates, and only the last value in a burst ever needs to hit the DOM.

This stresses the cost of *writing* to the reactive system (pull-based systems bump a revision, push-based systems visit subscribers), the ability to coalesce a burst of writes into one render, and the cost of updating many consumers of the same value in that render.

#### DB Monitoring + Live Chat + interactivity retention

Since we're all making apps, this benchmark is arguably the most important, as it measures the ability for users to feel like the site is still responsive while data is updating on the page.

Inspired by [dbmon repaint challenge](https://mathieuancelin.github.io/js-repaint-perfs/)

> [!NOTE]  
> Many dbmon benchmark implementations use row-virtualization. This bench does not do that, but does render a fixed number of rows -- we are stressing rendering as well as reactivity -- but in a real app, you may want virtual row rendering.

The score is the average frame rate over each 5s window, sampled 5 times from
one page load.

FPS can't go above the monitor's refresh rate, so frameworks at the ceiling
are tied, even if some of them have headroom left. This is why we throttle
the CPU when running the benches -- slowed down enough, nobody's at the
ceiling, and the differences show.

#### The `(async)` variants

Some benches appear twice, once plain and once `(async)`. The async ones give
up control between updates instead of running the whole loop synchronously.

By default the yield is a microtask (`await 0`). Frameworks that flush on a
microtask get to render between updates. Frameworks that schedule on a task,
a frame, or an idle callback don't, because microtasks drain first. That's a
real difference between frameworks, but it's not how sockets deliver data --
keep that in mind when reading these rows.

`?yield=macro` runs the same loops over real tasks (the same MessageChannel
trick the fan out bench uses), which is how a `websocket.on('message')`
handler actually gets called. It's not the default because a task per update
makes the 100k benches take tens of seconds per sample.

### Measuring "done"

Every bench that completes marks `:start` and `:done`. The time between them
is the sample.

- `:start` is set after the app has booted and settled, right before the first
  update. Boot time is someone else's benchmark.
- `:done` is set as soon as the DOM shows the finished state. A
  MutationObserver re-checks whenever the DOM changes, so we notice the moment
  the framework renders, no matter what it schedules rendering on. No waiting
  on a frame or an idle callback. (`:done` also records how it settled, as
  `{ checks, via }`.)

"Finished" means the whole DOM, not a spot check. The list benches check every
item against what the run should have left behind. Fan out knows exactly what
its final text is (the last value, once per consumer) and compares the whole
container against that. Partially-flushed doesn't count.

If the DOM never gets there, the page throws after 30s and the runner fails
the whole run. There's no such thing as a partial sample in the results.

### Reliability

**What the numbers are.** Each cell is a percentile of that series' samples.
p50 (the median) by default, p75 and p90 selectable. Percentiles always run
toward the worse end, whichever direction that is, so pXX reads "XX% of samples
were at least this good".

Median and not mean, because samples aren't spread evenly around a true value.
One GC pause adds a one-sided lump that the mean keeps and the median ignores.
We've seen the two differ by 47% -- enough to reorder a row.

**How many samples.** `--count` (default 10) page loads per bench per
framework. dbmon takes its 5 samples from one page load, so its spread is
narrower than it looks.

**Harness overhead.** The `:done` observer only attaches when the DOM isn't
already correct at the end of the update loop -- for benches that render
synchronously it never attaches at all. When it does attach, watching costs
about half a microsecond per DOM write. On the heaviest bench that's 1-4% of
the sample, under the run-to-run noise.

**Identical work.** All randomness is seeded (`?seed=`, default 1): which items
get updated, what dbmon mutates, worker delays, chat text. Same seed, same
final DOM, byte for byte, across every framework. Scheduling isn't controlled
though -- workers interleave with the main thread however the OS wants.

**Ordering.** Each framework's whole suite runs before the next framework
starts, so on a long run, heat and boost drift land on whoever goes last.
Run on a machine that isn't doing anything else.

**What is not comparable.** Different `--cpu-throttle`, different machines,
different refresh rates. All of it is recorded in the results file.

**Environment.** Run headed (the default) on your fastest monitor, keep the
window visible, and close everything else. Chrome throttles rAF for windows it
thinks you can't see -- the runner disables what it can, but it can't help a
window you've covered up.


## Adding a new framework

1. Add relevant information to ./results/app/frameworks.ts
2. Add the framework's logo to `./results/public/`
3. `mkdir frameworks/$frameworkName`
4. For each benchmark, create a separate project in `frameworks/$frameworkName` that implements that benchmark
5. Open a PR <3

## Running the Benchmark

1. Clone the repo
2. `cd` into the cloned repo
3. With a terminal on your fastest monitor, run:

    ```bash
    pnpm install
    pnpm bench
    ```

    There are interactive prompts to choose which frameworks / benchmarks to run.

    To skip the picking, `pnpm bench --framework=all --bench=all` runs everything.
    (Every flag is listed in the table the runner prints on start up.)

4. Wait for it to finish
5. View results:
    1. `cd results`
    2. `pnpm install`
    3. `pnpm start`

### Flags

| flag | default | |
| --- | --- | --- |
| `--framework` | prompts | a framework name, or `all` |
| `--bench` | prompts | a benchmark's display name, or `all`; repeat the flag to select several |
| `--count` | `10` | samples per bench per framework |
| `--cpu-throttle` | `1` | emulated CPU slowdown; runs at different settings are not comparable |
| `--headless` | off | headless caps at 60fps, so the frame-rate bench means less |
| `--timeout` | `60000` | ms a single sample may take before the run fails |
| `--skip-build` | off | re-use an existing build |
| `--include-prs` | off | record the PRs that landed since the previous result set in the run's notes (from git history; shown in the results app) |
| `--file` | prompts | append to this existing result file; the bench selection comes from the file, so only `--framework` is left to pick |

### Adding one framework to an existing result set

```bash
pnpm bench:add
```

An interactive wrapper around `pnpm bench` for when a result set (or
`use-tar-for` experiment) already exists and one framework needs to be
added to it -- or re-run and replaced (runs are stored by framework name,
so a re-run overwrites the previous ones).

It walks through picking the file, the framework, and which of the file's
benches to run -- all of them by default; a subset replaces just those of
the framework's runs and leaves the rest alone. It re-uses the
`--cpu-throttle` / `--count` / `--timeout` / `--headless` settings recorded
in the file (mixing settings within a file would make its numbers
incomparable), and then hands off to `pnpm bench` with those flags.

Hardware is held to the same standard: appending to a file recorded on a
different machine (cpu, ram, or monitor refresh rate) is an error, and an
OS or browser difference is warned about.

### Query params

The apps read their own config from the URL, so you can open any bench and
poke at it by hand -- `pnpm --filter <app> dev`, then add these.

| param | default | |
| --- | --- | --- |
| `seed` | `1` | seeds every random choice; the same seed is the same workload |
| `items` | `10000` | list length, for the list benches |
| `updates` | `10000` | how many updates the run performs |
| `random` | `false` | update random indices rather than sequential ones |
| `percentRandomAwait` | `0` | how often the loop yields between updates (0-100) |
| `yield` | `micro` | `micro` for a microtask, `macro` for a real task |
| `consumers` | `1000` | fan-out only: how many places render the value |
| `burstSize` | `100` | fan-out only: updates per socket message |
| `rows` | `20` | dbmon only: row pairs in the table |
| `mutations` | `15` | dbmon only: percent of rows that change per tick |

## Benchmarking an unreleased version of a framework

A PR, a nightly, a local build -- anything you can `npm pack` into a tarball:

```bash
pnpm use-tar-for ember ./path-to/ember-source.tgz
```

The tarball is copied to the root of the repo, and every app in `frameworks/ember/`
is pointed at it. Then run the benchmark as usual, and compare the run against a
run of `main` in the results app.

The version number that gets recorded for such a run is whatever the branch happened
to be cut from, which says nothing about what was measured -- so tell the runner where
the build came from, and the results app links to the PR instead:

```bash
pnpm bench --framework=all --bench=all --ember=https://github.com/emberjs/ember.js/pull/21514
```

`--<framework>=<pr>` works for every framework in `results/app/frameworks.ts`
(`--vue=`, `--svelte=`, ...), and takes a link or `owner/repo#number`.

For ember specifically, CI can do all of that for you: run the
[**Try Ember PR**](../../actions/workflows/try-ember-pr.yml) workflow with a link to a
PR on `emberjs/ember.js` (or just its number). It builds that PR, installs the build
in every ember app, and opens a draft PR here with the result -- check it out, and
`pnpm bench`.

