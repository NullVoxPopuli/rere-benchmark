import { defineConfig } from "vite";
import fsSync from "node:fs";
import { basename, join } from "node:path";
import { ember } from "@nullvoxpopuli/ember-vite";
import fullReload from "vite-plugin-full-reload";
import { scopedCSS } from "ember-scoped-css/rollup";

const RESULT_SETS = "virtual:result-sets";
const RESOLVED_RESULT_SETS = "\0" + RESULT_SETS;

/**
 * An experiment's name is a prefix and a number (`ember-1`); official runs
 * are just numbers (`6`). The prefix, when there is one, is worth showing.
 */
function prefixOf(name) {
  const at = name.lastIndexOf("-");

  if (at <= 0) return undefined;
  if (!Number.isInteger(Number(name.slice(at + 1)))) return undefined;

  return name.slice(0, at);
}

/**
 * What the app needs to *display* a result set without fetching it: the
 * run date, the environment headline (CPU count, browser, refresh rate),
 * and the CPU throttle the run applied. Every field is optional -- older
 * result sets predate some of them, and a missing field just drops out of
 * the displayed name.
 */
function metaOf(name, json) {
  const meta = {};
  const prefix = prefixOf(name);
  const environment = json.environment ?? {};

  if (prefix) meta.prefix = prefix;
  if (typeof json.date === "string") meta.date = json.date;
  // environment.cpu is the logical CPU *count*; machine.cpu is the model
  if (typeof environment.cpu === "number") meta.cpus = environment.cpu;
  if (typeof environment.monitor?.hz === "number") meta.hz = environment.monitor.hz;
  if (typeof json.args?.CPU_THROTTLE === "number") meta.throttle = json.args.CPU_THROTTLE;

  const browser = environment.browser ?? {};

  if (typeof browser.name === "string" && typeof browser.version === "string") {
    meta.browser = { name: browser.name, version: browser.version };
  }

  return meta;
}

/**
 * Every result set in a directory with its display metadata, newest run
 * first. File names are just numbers (plus a prefix for experiments); the
 * run date lives inside each file, so ordering comes from reading them --
 * name order (numeric-aware) only breaks ties. Missing directories read
 * as empty -- experiments are optional.
 */
function setsIn(dir) {
  if (!fsSync.existsSync(dir)) return [];

  const sets = [];

  for (const file of fsSync.readdirSync(dir)) {
    if (!file.endsWith(".json")) continue;

    const name = basename(file, ".json");
    const json = JSON.parse(fsSync.readFileSync(join(dir, file), "utf8"));

    sets.push({ name, meta: metaOf(name, json) });
  }

  return sets.sort(
    (a, b) =>
      (Date.parse(b.meta.date ?? "") || 0) - (Date.parse(a.meta.date ?? "") || 0) ||
      b.name.localeCompare(a.name, undefined, { numeric: true }),
  );
}

/**
 * Like vite-plugin-virtual, but re-reads the directories whenever files
 * change in public/results or public/experiments -- otherwise the dev
 * server keeps serving the manifest from when it started, and newly added
 * result files (or freshly appended runs) never show up (until a server
 * restart).
 *
 * Result sets come in two categories: `runs` (the official runs in
 * public/results) and `experiments` (public/experiments). `metadata` maps
 * a set's name to what the app shows for it before the set is loaded.
 */
function resultSets() {
  return {
    name: "result-sets",
    resolveId(id) {
      if (id === RESULT_SETS) return RESOLVED_RESULT_SETS;
    },
    load(id) {
      if (id !== RESOLVED_RESULT_SETS) return;

      const runs = setsIn("./public/results");
      const experiments = setsIn("./public/experiments");
      const metadata = {};

      for (const set of runs.concat(experiments)) {
        metadata[set.name] = set.meta;
      }

      return (
        `export const runs = ${JSON.stringify(runs.map((set) => set.name))};\n` +
        `export const experiments = ${JSON.stringify(experiments.map((set) => set.name))};\n` +
        `export const metadata = ${JSON.stringify(metadata)};`
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
      // appends rewrite an existing file, and the manifest now carries
      // content (the metadata), not just names
      server.watcher.on("change", invalidate);
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
