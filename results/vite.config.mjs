import { defineConfig } from 'vite';
import fsSync from 'node:fs';
import { extensions, ember } from '@embroider/vite';
import { babel } from '@rollup/plugin-babel';
import fullReload from 'vite-plugin-full-reload';
import { scopedCSS } from 'ember-scoped-css/rollup';

const RESULT_SETS = 'virtual:result-sets';
const RESOLVED_RESULT_SETS = '\0' + RESULT_SETS;

/**
 * Like vite-plugin-virtual, but re-reads the directory whenever
 * files change in public/results -- otherwise the dev server keeps
 * serving the file list from when it started, and newly added
 * result files never show up (until a server restart).
 */
function resultSets() {
  return {
    name: 'result-sets',
    resolveId(id) {
      if (id === RESULT_SETS) return RESOLVED_RESULT_SETS;
    },
    load(id) {
      if (id !== RESOLVED_RESULT_SETS) return;

      let sets = fsSync.readdirSync('./public/results');
      let dates = sets
        .map((x) => x.replace('.json', ''))
        .sort()
        .reverse()
        .map((x) => `"${x}"`)
        .join(', ');

      return `export const results = [${dates}];`;
    },
    configureServer(server) {
      const invalidate = (path) => {
        if (!path.includes('public/results')) return;

        const mod = server.moduleGraph.getModuleById(RESOLVED_RESULT_SETS);

        if (mod) server.moduleGraph.invalidateModule(mod);
      };

      server.watcher.on('add', invalidate);
      server.watcher.on('unlink', invalidate);
    },
  };
}

export default defineConfig({
  plugins: [
    ember(),
    babel({
      babelHelpers: 'runtime',
      extensions,
    }),
    scopedCSS(),
    fullReload(['./public/results/**/*'], { always: true }),
    resultSets(),
  ],
});
