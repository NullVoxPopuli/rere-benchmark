import { defineConfig } from "vite";
import fsSync from "node:fs";
import { ember } from "@nullvoxpopuli/ember-vite";
import fullReload from "vite-plugin-full-reload";
import { scopedCSS } from "ember-scoped-css/rollup";

const RESULT_SETS = "virtual:result-sets";
const RESOLVED_RESULT_SETS = "\0" + RESULT_SETS;

/**
 * The names of every result file in a directory, newest-first. Missing
 * directories read as empty -- experiments are optional.
 */
function namesIn(dir) {
  if (!fsSync.existsSync(dir)) return [];

  return fsSync
    .readdirSync(dir)
    .filter((x) => x.endsWith(".json"))
    .map((x) => x.replace(/\.json$/, ""))
    .sort()
    .reverse();
}

/**
 * Like vite-plugin-virtual, but re-reads the directories whenever files
 * change in public/results or public/experiments -- otherwise the dev
 * server keeps serving the file list from when it started, and newly added
 * result files never show up (until a server restart).
 *
 * Result sets come in two categories: `runs` (the official runs in
 * public/results) and `experiments` (public/experiments).
 */
function resultSets() {
  return {
    name: "result-sets",
    resolveId(id) {
      if (id === RESULT_SETS) return RESOLVED_RESULT_SETS;
    },
    load(id) {
      if (id !== RESOLVED_RESULT_SETS) return;

      const runs = namesIn("./public/results");
      const experiments = namesIn("./public/experiments");

      return (
        `export const runs = ${JSON.stringify(runs)};\n` +
        `export const experiments = ${JSON.stringify(experiments)};`
      );
    },
    configureServer(server) {
      const invalidate = (path) => {
        if (!path.includes("public/results") && !path.includes("public/experiments")) {
          return;
        }

        const mod = server.moduleGraph.getModuleById(RESOLVED_RESULT_SETS);

        if (mod) server.moduleGraph.invalidateModule(mod);
      };

      server.watcher.on("add", invalidate);
      server.watcher.on("unlink", invalidate);
    },
  };
}

export default defineConfig({
  plugins: [
    ember(),
    scopedCSS(),
    fullReload(["./public/results/**/*"], { always: true }),
    resultSets(),
  ],
});
