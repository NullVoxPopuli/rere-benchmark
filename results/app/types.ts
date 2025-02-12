export type Results = Result[];

export interface Result {
  name: string;
  color: string;
  speed: number;
}

export interface Mark {
  name: string;
  at: number;
}
export interface ResultData {
  [framework: string]: {
    [benchName: string]: {
      url: string;
      version: string;
      times: Array<[Mark, Mark]>;
    };
  };
}

export interface ResultSet {
  /**
   * YYYY-MM-DD
   */
  date: string;
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
