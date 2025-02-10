# rere-benchmark

> [!NOTE]  
> This whole repo should be taken with a grain of salt right now. The benchmarks are still being developed. 


## TODOs

- When running the benchmark, capture the version numbers
- Split all benches by "auto-batch" vs "manual batch" -- as manual batching is a low-level fix to noisy updates, and we want to capture performance of both situations.
- Add another page for viewing the data as boxplots (important to understand how reliable individual test runs are)

- More Benches:
  - db mon + chat + typing-responsiveness

- create lints 
  - we don't want to prescribe pnpm vs npm vs yarn, so folks should provide an
    - install.sh and a build.sh?
    - config file? yaml? everyone loves yaml

- create tests
  - we need to ensure folks don't cheat
  - how to do this? Should we just trust code review?

- create ci check to comment back on the PR if the src/runner can't access the build:prod output
- document the methodology

-----------------------------------------


This is the Reactivity and Rendering Benchmark for frontend application and component frameworks.

- [Motivation](#motivation) 
- [Methodology](#methodology)
- [Adding a new framework](#adding-a-new-framework)


## Motivation

I've felt that existing benchmarks don't exactly capture the things that _I_ care most about -- the ability to be fast once the app is booted. Afterall, the thing with single-page-apps is that you generally accept that there may be a higher up front cost, and then things are smooth sailing from there. 

The [JS Framework Benchmark](https://github.com/krausest/js-framework-benchmark) is the most notorious Frontend JS benchmark out there, but it focuses on boot time, memory, and generally some metrics similar to what [Page Speed Insights](https://pagespeed.web.dev/) focuses on. These are _good benchmarks_ for SEO, conversion, etc. 

There is also [JS Reactivity Benchmark](https://github.com/milomg/js-reactivity-benchmark), which aims to measure and stress a reactive system's ability to handle various sized and connected graphs of reactive data. However, this benchmark _requires_ the use of effects and does not represent a real world rendering-an-app situation, as you would build a web-based product with. 

_To be clear_, I think for what these benchmarks do, they do a good job. 

They just are not complete, and I'm mostly focused an apps: those with interactivity, rendering, representing live information, etc, 

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

#### 10k items, one update (variable) 

This test is coverying a few things: iteration, ability to efficiently update one thing in the list without re-rendering the list, as well as the ability to handle a reactive collection, as is common in tables where you edit data.

#### DB Monitoring + Live Chat + interactivity retention

Since we're all making apps, this benchmark is arguably the most important, as it measures the ability for users to feel like the site is still responsive while data is updating on the page.

Inspired by [dbmon repaint challenge](https://mathieuancelin.github.io/js-repaint-perfs/)

> [!NOTE]  
> Many dbmon benchmark implementations use row-virtualization. This bench does not do that, but does render a fixed number of rows -- we are stressing rendering as well as reactivity -- but in a real app, you may want virtual row rendering.

### Measuring "done" 

TOOD: Write this

### Reliability

TODO: Write this


## Adding a new framework

1. Add relevant information to ./results/app/frameworks.ts
2. Add the framework's logo to `./results/public/`
2. `mkdir frameworks/$frameworkName`
3. For each benchmark, create a separate project in `frameworks/$frameworkName` that implements that benchmark
4. Open a PR <3 

## Renning the Benchmark

1. Clone the repo
2. `cd` into the cloned repo
3. With a terminal on your fastest monitor, run:

    ```bash
    pnpm install
    pnpm bench
    ```

    There are interactive prompts to choose which frameworks / benchmarks to run.

4. Wait for it to finish    
5. View results:
    1. `cd results`
    2. `pnpm install`
    3. `pnpm start`

