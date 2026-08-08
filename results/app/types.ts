export type Results = Result[];

export interface Result {
  name: string;
  color: string;
  speed: number;
  version: string;
  units: string;
}

export interface Mark {
  name: string;
  at: number;
  detail: number;
}
export interface ResultData {
  [framework: string]: {
    [benchName: string]: {
      url: string;
      version: string;
      measure?: string;
      whatsBetter?: "bigger";
      times: Array<Mark[]>;
    };
  };
}

/**
 * An optional override that replaces a framework's version label in the
 * results app with a link — e.g. to the PR the build was produced from.
 */
export interface VersionOverride {
  /**
   * The PR number, rendered as `#<number>` in place of the version.
   */
  number: string | number;
  /**
   * Where the label links to (e.g. the PR on GitHub).
   */
  url: string;
}

/**
 * A PR recorded in a result set's notes. The runner writes these
 * (`--include-prs`) from git history between the previous result set and
 * the run; hand-added entries may also be plain URL strings.
 */
export interface PullRequestNote {
  url: string;
  /**
   * The PR title, from the merge (or squash) commit. Absent on
   * hand-added entries.
   */
  title?: string;
}

/**
 * Small labels a run records about a framework, collected by the runner
 * from `frameworks/<framework>/notes.json`.
 */
export interface FrameworkNotes {
  /**
   * The flavor of the framework the run used -- e.g. "Vapor" for a Vue
   * Vapor build. Shown under the framework's name, above its version.
   */
  variant?: string;
}

export interface BenchmarkInfo {
  name: string;
  app: string;
  query: string;
  measure?: string;
  whatsBetter: "bigger" | "smaller";
  units: string;
}

export interface ResultSet {
  /**
   * YYYY-MM-DD
   */
  date: string;
  sha: string;
  args?: {
    SKIP_BUILD?: boolean;
    /**
     * The CPU slowdown multiplier applied during the run.
     * 1 (or unset) means no throttling.
     */
    CPU_THROTTLE?: number;
    HEADLESS?: boolean;
    COUNT?: number;
  };
  timing?: {
    /**
     * Wall-clock time (ms) spent installing + building all apps.
     * Omitted when the build was skipped.
     */
    buildMs?: number;
    /**
     * Wall-clock time (ms) spent running the benchmark suite.
     */
    benchmarkMs: number;
    /**
     * Total wall-clock time (ms) for the whole run, build + benchmark.
     */
    totalMs: number;
  };
  selections: {
    benches: string[];
    frameworks: string[];
  };
  benchmarkInfo: BenchmarkInfo[];
  /**
   * Optional per-framework overrides that replace the version label in the
   * results app with a link (e.g. to the PR a build came from). Keyed by
   * framework name, e.g. `{ ember: { number: 21513, url: "https://..." } }`.
   */
  versionOverrides?: Record<string, VersionOverride>;
  /**
   * Optional per-framework notes, keyed by framework name. Collected by the
   * runner from `frameworks/<framework>/notes.json`, e.g.
   * `{ vue: { variant: "Vapor" } }`.
   *
   * `prs` sits alongside the framework keys: the PRs that landed between
   * the previous result set and this run (see {@link PullRequestNote}).
   */
  notes?: {
    prs?: Array<string | PullRequestNote>;
  } & Record<string, FrameworkNotes>;
  environment: {
    machine: {
      os: {
        name: string;
        version: string;
      };
      cpu: string;
      ram: string;
    };
    browser: {
      name: string;
      version: string;
    };
    monitor: {
      hz: number;
    };
  };
  results: ResultData;
}

/**
 * One value column in a results view.
 *
 * Most columns read from the run the page is showing, but a borrowed one
 * reads from whichever run it was picked out of. Keeping the source on the
 * column is what lets a borrowed column sort and colour alongside the rest
 * instead of being appended to the end as a special case.
 */
export interface Column {
  /**
   * Identity for per-column lookups. A borrowed column can repeat a
   * framework already in the table, so this is not just the framework name.
   */
  key: string;
  framework: string;
  data: ResultSet;
  /**
   * The run a borrowed column came from. Absent on the table's own columns,
   * so it doubles as the "is this borrowed" test.
   */
  borrowedFrom?: string;
}
