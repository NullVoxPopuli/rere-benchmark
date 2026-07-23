# Angular

Creating new benches

```bash
pnpm dlx @angular/cli@latest new my-app --style=css --ssr=false --skip-tests --skip-git --defaults
```

then: delete all the fluff for real world projects (router, favicon, `.vscode/`, etc),
flatten the build output (`outputPath: { "base": "dist", "browser": "" }` in `angular.json`,
so the bench runner finds `dist/index.html`), and add the `common: link:../../../common`
dependency.

Notes:

- Angular 20+ apps are zoneless by default (no `zone.js`); components here use
  signals, `ChangeDetectionStrategy.OnPush`, and the built-in `@for` control flow.
- `@angular/build` only bundles `new Worker(new URL(...))` found in application
  code -- not inside dependencies. The dbmon bench's workers live in the linked
  `common` package, so `dbmon-with-chat` pre-bundles them into `public/dbmon/`
  with a small esbuild script (see its `scripts/bundle-workers.mjs`).
