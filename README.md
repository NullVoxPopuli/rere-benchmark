# rere-benchmark

This is the Reactivity and Rendering Benchmark for frontend application and component frameworks.

- [Motivation](#motivation) 
- [Methodology](#methodology)
- [Adding a new framework](#adding-a-new-framework)


## Motivation



## Methodology


## Adding a new framework

1. Add relevant information to ./results/app/frameworks.ts
2. Add the framework's logo to `./results/public/`
2. `mkdir frameworks/$frameworkName`
3. For each benchmark, create a separate project in `frameworks/$frameworkName` that implements that benchmark
4. Open a PR <3 


Very wip

TODO:
- More Benches:
  - 10k, 5, 10, 25% updates (random)
  - db mon + chat
  - 

- implement the two tests for each of the starter frameworks
  - ember
  - react
  - solid
  - svelte
  - vue
- create lints 
  - we don't want to prescribe pnpm vs npm vs yarn, so folks should provide an
    - install.sh and a build.sh?
    - config file? yaml? everyone loves yaml

- create tests
  - we need to ensure folks don't cheat

- create ci check to comment back on the PR if the src/runner can't access the build:prod output
- graph the results
- implement a monthly CI cron to remind me to run the tests on in a controlled environment (not CI)
- document the methodology
- document how to add more frameworks
