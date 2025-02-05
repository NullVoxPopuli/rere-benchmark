export type Results = Result[];
interface Result {
  name: string;
  color: string;
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
