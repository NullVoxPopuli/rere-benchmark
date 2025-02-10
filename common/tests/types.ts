export interface BenchTest<DataType> {
  getData(): DataType;
  verify(): boolean;
  run(): unknown;
}
