import { defineConfig, globalIgnores } from 'eslint/config';

import { configs } from '@nullvoxpopuli/eslint-configs';

export default defineConfig([
  ...configs.node(import.meta.dirname),
  globalIgnores(['common', 'frameworks', 'results', 'tests', 'node_modules']),
  {
    files: ['src/**'],
    rules: {
      'n/no-process-exit': 'off',
      'no-console': 'off',
    },
  },
]);
