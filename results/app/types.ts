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

export interface BenchmarkInfo {
  name: string;
  app: string;
  query: string;
  measure?: string;
  whatsBetter: "bigger" | "smaller";
  units: string;
  /**
   * Relative importance in cross-bench aggregations (e.g. the "times
   * best" total's weighted geometric mean). Defaults to 1.
   */
  weight?: number;
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
