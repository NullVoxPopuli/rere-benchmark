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
      whatsBetter?: 'bigger';
      times: Array<Mark[]>;
    };
  };
}

export interface BenchmarkInfo {
  name: string;
  app: string;
  query: string;
  measure?: string;
  whatsBetter: 'bigger' | 'smaller';
  units: string;
}

export interface ResultSet {
  /**
   * YYYY-MM-DD
   */
  date: string;
  sha: string;
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
