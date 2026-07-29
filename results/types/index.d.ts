declare module "virtual:result-sets" {
  /**
   * The official benchmark runs, from public/results, newest-first.
   */
  export const runs: string[];
  /**
   * Experimental runs, from public/experiments, newest-first.
   */
  export const experiments: string[];
}
