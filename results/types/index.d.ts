declare module "virtual:result-sets" {
  /**
   * The official benchmark runs, from public/results, newest-first
   * (by the run date recorded inside each file).
   */
  export const runs: string[];
  /**
   * Experimental runs, from public/experiments, newest-first.
   */
  export const experiments: string[];
  /**
   * What a result set's name displays as, extracted from the set's JSON at
   * build time so no set has to be fetched before it's shown. Every field
   * is optional: older sets predate some of them, and a missing field just
   * drops out of the displayed name.
   */
  export interface ResultSetMeta {
    /**
     * The experiment prefix from the file name (`ember-1` -> `ember`).
     * Official runs have none.
     */
    prefix?: string;
    /**
     * When the run started, ISO 8601.
     */
    date?: string;
    /**
     * Logical CPU count of the machine.
     */
    cpus?: number;
    browser?: { name: string; version: string };
    /**
     * The monitor's refresh rate.
     */
    hz?: number;
    /**
     * The CPU slowdown multiplier the run applied (`args.CPU_THROTTLE`);
     * 1 means the run was not throttled.
     */
    throttle?: number;
  }
  export const metadata: Record<string, ResultSetMeta | undefined>;
}
