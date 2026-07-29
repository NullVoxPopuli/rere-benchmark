# Changelog

changes to implementations (or the benchmark) over time

## 2026-07-29

### React

- https://github.com/NullVoxPopuli/rere-benchmark/pull/74
    - move from `useEffect` -> `useLayoutEffect` showed a great increase in performance, as `useLayoutEffect` runs before paint

### Svelte

- https://github.com/NullVoxPopuli/rere-benchmark/issues/77
    - bench: `dbmon-with-chat`
        - moving from `$state(new Map())` to `SvelteMap` showed a small boost in perf at 8x cpu throttle 


## 2026-07-28

### React

- https://github.com/NullVoxPopuli/rere-benchmark/pull/71
    - Enable the react compiler

### Solid

- https://github.com/NullVoxPopuli/rere-benchmark/pull/69
    - `useEffect` -> `onSettled`
    - instead of using JSX for some elements' contents, `textContent` is being set directly
    - bench: `10k items 1 update`
        - instead of item iteration, (`<For />`), `<Repeat />` is used
    - bench: `dbmon-with-chat`
        - iteration keyed manually on dbname

### Vue

- https://github.com/NullVoxPopuli/rere-benchmark/pull/72
    - enable Vue Vapor
