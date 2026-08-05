/**
 * The benchmark catalog: every bench the runner can run, and the variants
 * each one runs in. Adding or tuning a bench happens here; how benches are
 * *selected* for a run lives in bench-info.ts.
 */
import type { BenchmarkInfo as SavedBenchmarkInfo } from '../../results/app/types.ts';

/**
 * What the results file records for a bench ({@link SavedBenchmarkInfo}),
 * plus runner-only concerns that are stripped before saving.
 */
export interface BenchmarkInfo extends SavedBenchmarkInfo {
  /**
   * Certain benchmarks intended to have observation, such as the dbmon bench -- where we take FPS samples of sliding window averages.
   *
   * Most benchmarks though will start a task and measure the time to completion of that task.
   *
   * The dbmon bench doesn't have completion,
   * as instead of measuring "duration of a task",
   * we are measuring "responsiveness" of the web page.
   */
  ignoreCount?: boolean;
}

export const variants = [
  // Batching is a fair (low-level) technique, but I don't know if I want it always present.
  // We'll see if I change my mind when Solid v2 comes out.
  //
  // I don't think users should have to think about whether or not to use batching.
  // This is why by defaultl it is "off"
  { name: '', query: '' },
  // { name: 'w/ manual batching', query: '&manualBatch=true' },
];

const randomAwaitChance = 100;

/**
 * TODO: make the bigger is better benchmark mutually exclusive
 *       to the smaller is better benchmarks
 */
export const benchmarks: BenchmarkInfo[] = [
  {
    name: 'DB Monitor w/ chat simulation',
    app: 'dbmon-with-chat',
    query: '',
    // This is a long running bench which we'll be taking multiple samples from
    ignoreCount: true,
    measure: 'fps',
    whatsBetter: 'bigger',
    units: 'FPS',
  },
  {
    name: 'Incrementing Render Effect',
    app: 'incrementing-render-effect',
    query: '&updates=100000',
    whatsBetter: 'smaller',
    units: 'ms',
  },
  {
    name: '1 item, 1k updates (async)',
    app: 'one-item-many-updates',
    query: `&updates=1000&percentRandomAwait=${randomAwaitChance}`,
    whatsBetter: 'smaller',
    units: 'ms',
  },
  {
    name: '1 item, 1k updates',
    app: 'one-item-many-updates',
    query: '&updates=1000&percentRandomAwait=0',
    whatsBetter: 'smaller',
    units: 'ms',
  },
  // {
  //   name: '1 item, 1k updates, triggered by render',
  //   app: 'one-item-many-updates',
  //   query: '&updates=1000&percentRandomAwait=0',
  // whatsBetter: 'smaller',
  // units: 'ms',
  // },
  {
    name: '1 item, 100k updates (async)',
    app: 'one-item-many-updates',
    query: `&updates=100000&percentRandomAwait=${randomAwaitChance}`,
    whatsBetter: 'smaller',
    units: 'ms',
  },
  {
    name: '1 item, 100k updates',
    app: 'one-item-many-updates',
    query: '&updates=100000&percentRandomAwait=0',
    whatsBetter: 'smaller',
    units: 'ms',
  },
  {
    name: '1k items, 1 update each (sequentially, async)',
    app: 'ten-k-items-one-time',
    query: `&items=1000&updates=1000&percentRandomAwait=${randomAwaitChance}`,
    whatsBetter: 'smaller',
    units: 'ms',
  },
  {
    name: '1k items, 1 update each (sequentially)',
    app: 'ten-k-items-one-time',
    query: '&items=1000&updates=1000&percentRandomAwait=0',
    whatsBetter: 'smaller',
    units: 'ms',
  },
  {
    name: '1k items 1 update on 5% (random, async)',
    app: 'ten-k-items-one-time',
    query: `&items=1000&updates=50&random=true&percentRandomAwait=${randomAwaitChance}`,
    whatsBetter: 'smaller',
    units: 'ms',
  },
  {
    name: '1k items 1 update on 5% (random)',
    app: 'ten-k-items-one-time',
    query: '&items=1000&updates=50&random=true&percentRandomAwait=0',
    whatsBetter: 'smaller',
    units: 'ms',
  },
  {
    name: '1k items 1 update on 25% (random, async)',
    app: 'ten-k-items-one-time',
    query: `&items=1000&updates=250&random=true&percentRandomAwait=${randomAwaitChance}`,
    whatsBetter: 'smaller',
    units: 'ms',
  },
  {
    name: '1k items 1 update on 25% (random)',
    app: 'ten-k-items-one-time',
    query: '&items=1000&updates=250&random=true&percentRandomAwait=0',
    whatsBetter: 'smaller',
    units: 'ms',
  },
  {
    name: '1 value, 1k consumers, 10k updates (bursts of 100)',
    app: 'fan-out',
    query: '&consumers=1000&updates=10000&burstSize=100',
    whatsBetter: 'smaller',
    units: 'ms',
  },
  {
    name: '1 value, 1k consumers, 10k updates (bursts of 1000)',
    app: 'fan-out',
    query: '&consumers=1000&updates=10000&burstSize=1000',
    whatsBetter: 'smaller',
    units: 'ms',
  },
  {
    name: '1 value, 1k consumers, 10k updates (single burst)',
    app: 'fan-out',
    query: '&consumers=1000&updates=10000&burstSize=10000',
    whatsBetter: 'smaller',
    units: 'ms',
  },
];
