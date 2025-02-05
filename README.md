# rere-benchmark

Very wip

TODO:
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
