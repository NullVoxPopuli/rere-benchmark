import { defineConfig } from 'vite';
import marko from '@marko/vite';

// linked mode is for SSR entrypoints; these apps are client-only,
// booted from index.html like every other framework here
export default defineConfig({
  plugins: [marko({ linked: false })],
});
