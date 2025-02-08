export type Results = Result[];

interface Result {
  name: string;
  color: string;
  logo: string;
  speed: number;
}

export interface Mark {
  name: string;
  startTime: number;
}
export interface ResultData {
  [framework: string]: {
    [benchName: string]: Array<[Mark, Mark]>;
  };
}

export interface ResultSet {
  /**
   * YYYY-MM-DD
   */
  date: string;
  environment: {
    os: {
      name: string;
      version: string;
    };
    cpu: string;
    ram: string;
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
