# react-starbeam

React apps whose state lives in [Starbeam](https://starbeamjs.com/) instead of
`useState`. Components read cells and reactive collections through
`useReactive()` from `@starbeam/react`, which subscribes the component and
re-renders it when tracked state changes.

To scaffold a new bench app, copy the matching `frameworks/react` app, then:

- add `@starbeam/react`, `@starbeam/universal`, and `@starbeam/collections`
  to `dependencies`
- remove the React Compiler toolchain (`babel-plugin-react-compiler`,
  `@rolldown/plugin-babel`, `@babel/core`, `@types/babel__core`) and its
  `vite.config.ts` wiring. The compiler memoizes on object identity and
  assumes getters are pure, which defeats Starbeam's tracked reads.
- copy `src/starbeam.d.ts` from one of these apps: the 0.10.0 packages
  declare `types: "./dist/index.d.ts"` but do not ship the file
