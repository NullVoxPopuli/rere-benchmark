import { defineConfig, searchForWorkspaceRoot } from 'vite'
import solid from 'vite-plugin-solid'

export default defineConfig({
  plugins: [solid()],
  server: {
    fs: {
      allow: [searchForWorkspaceRoot(process.cwd()), `../../../common`],
    },
  },
})
