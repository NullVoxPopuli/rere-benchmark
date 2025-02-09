# rere-benchmark

> [!NOTE]  
> This whole repo should be taken with a grain of salt right now. The benchmarks are still being developed. 


This is the Reactivity and Rendering Benchmark for frontend application and component frameworks.

- [Motivation](#motivation) 
- [Methodology](#methodology)
- [Adding a new framework](#adding-a-new-framework)


## Motivation

TODO: Write this

## Methodology

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

4. Wait for it to finish    
5. View results:
    1. `cd results`
    2. `pnpm install`
    3. `pnpm start`

## TODOs

- More Benches:
  - 10k, 5, 10, 25% updates (random)
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
- document how to add more frameworks
