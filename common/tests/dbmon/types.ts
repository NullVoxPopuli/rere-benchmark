interface QueryInfo {
  elapsed: number; // decimal
  elapsedClassName: string;
  formatElapsed: string; // decimal number
  query: string;
  waiting: boolean;
}

export interface Row {
  dbname: string;
  lastMutationId: number;
  lastSample: {
    countClassName: string;
    nbQueries: number;
    queries: QueryInfo[];
    topFiveQueries: QueryInfo[];
  };
}
