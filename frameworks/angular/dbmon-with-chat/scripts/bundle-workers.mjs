import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

/**
 * The dbmon bench's web workers live in the linked `common` package and
 * are created there via `new Worker(new URL('./dbmon/db-worker.js', import.meta.url))`.
 * Vite-based apps get those bundled automatically, but @angular/build only
 * detects Worker construction in application code -- not inside dependencies.
 *
 * So: bundle the workers ourselves into public/dbmon/, which is exactly
 * where the runtime URL resolution points once `common` is inlined into
 * main.js at the server root (both `ng serve` and the built dist).
 */
const root = fileURLToPath(new URL('..', import.meta.url));

await build({
  entryPoints: [
    'node_modules/common/src/tests/dbmon/db-worker.js',
    'node_modules/common/src/tests/dbmon/chat-worker.js',
  ],
  absWorkingDir: root,
  bundle: true,
  format: 'esm',
  target: 'es2022',
  minify: true,
  outdir: 'public/dbmon',
});
