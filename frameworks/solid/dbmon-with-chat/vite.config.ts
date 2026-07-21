import { defineConfig, searchForWorkspaceRoot } from 'vite'
import solid from 'vite-plugin-solid'

export default defineConfig({
  // the linked `common` package lives outside this app's root; without this,
  // its web workers 403 in dev (`/@fs/...` blocked by server.fs.allow)
  server: {
    fs: {
      allow: [searchForWorkspaceRoot(process.cwd()), '../../../common'],
    },
  },
  plugins: [solid()],
})
