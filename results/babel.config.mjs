import { buildMacros } from '@embroider/macros/babel';
import { fileURLToPath } from 'node:url';
import { scopedCSS } from 'ember-scoped-css/babel';

const macros = buildMacros();

export default {
  plugins: [
    [
      '@babel/plugin-transform-typescript',
      {
        allExtensions: true,
        onlyRemoveTypeImports: true,
        allowDeclareFields: true,
      },
    ],
    scopedCSS(),
    [
      'babel-plugin-ember-template-compilation',
      {
        transforms: [...macros.templateMacros, scopedCSS.template({})],
      },
    ],
    [
      'module:decorator-transforms',
      {
        runtime: {
          import: fileURLToPath(
            import.meta.resolve('decorator-transforms/runtime-esm'),
          ),
        },
      },
    ],
    [
      '@babel/plugin-transform-runtime',
      {
        absoluteRuntime: import.meta.dirname,
        useESModules: true,
        regenerator: false,
      },
    ],
    ...macros.babelMacros,
  ],

  generatorOpts: {
    compact: false,
  },
};
