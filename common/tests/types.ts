export interface BenchTest<DataType> {
  getData(): DataType;
  verify(): boolean;
  run(...args: unknown[]): unknown;
}
