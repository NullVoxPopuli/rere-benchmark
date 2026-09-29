import { defineConfig } from 'vite';
import marko from '@marko/vite';

export default defineConfig(({ command }) => ({
  // linked mode is for SSR entrypoints; these apps are client-only,
  // booted from index.html like every other framework here
  plugins: [marko({ linked: false })],
  resolve: {
    // in dev the compiled templates import marko/debug/dom, and
    // src/flush.js must run() that same copy of the runtime
    alias: command === 'serve' ? { 'marko/dom': 'marko/debug/dom' } : {},
  },
}));
