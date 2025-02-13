import { defineConfig } from 'vite';
import fsSync from 'node:fs';
import { extensions, ember } from '@embroider/vite';
import { babel } from '@rollup/plugin-babel';
import virtual from 'vite-plugin-virtual';
import fullReload from 'vite-plugin-full-reload';

export default defineConfig({
  plugins: [
    ember(),
    babel({
      babelHelpers: 'runtime',
      extensions,
    }),
    fullReload(['./public/results/**/*'], { always: true }),
    virtual({
      'virtual:result-sets': () => {
        let sets = fsSync.readdirSync('./public/results');
        let dates = sets
          .map((x) => x.replace('.json', ''))
          .sort()
          .reverse()
          .map((x) => `"${x}"`)
          .join(', ');

        return `export const results = [${dates}];`;
      },
    }),
  ],
});
