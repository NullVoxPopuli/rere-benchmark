import { defineConfig, searchForWorkspaceRoot } from "vite";
import { ember } from "@nullvoxpopuli/ember-vite";

export default defineConfig({
  server: {
    fs: {
      allow: [searchForWorkspaceRoot(process.cwd()), "../../../common"],
    },
  },
  plugins: [ember()],
});
