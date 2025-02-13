export interface BenchTest<DataType> {
  getData(): DataType;
  verify(): boolean;
  doit(...args: unknown[]): unknown;
  prepare(...args: unknown[]): unknown;
  run(...args: unknown[]): unknown;
}
