import Route from 'ember-route-template';
import { assert } from '@ember/debug';
import { pageTitle } from 'ember-page-title';
import { AnimateResults } from './results';

import jsonData from '../results.json';

import type { Mark, ResultData } from './types.ts';

const results = jsonData as unknown as ResultData;
/**
 * TODO: add logos
 */
const frameworks: Record<string, { color: string }> = {
  ember: {
    color: '#E04E39',
  },
  react: {
    color: '#61DBFB',
  },
  solid: {
    color: '#2c4f7c',
  },
  vue: {
    color: '#42b883',
  },
  svelte: {
    color: '#ff3e00',
  },
};

function averageOf(arrayOfMarks: Array<[Mark, Mark]>) {
  const durations = [];

  for (const pair of arrayOfMarks) {
    const start = pair.find((x) => x.name.endsWith('start'));
    const done = pair.find((x) => x.name.endsWith('done'));
    const duration = done.startTime - start.startTime;
    durations.push(duration);
  }

  let total = 0;
  durations.forEach((d) => (total += d));
  return total / durations.length;
}

function dataOf(benchName: string) {
  const list = [];

  for (const [framework, benches] of Object.entries(results)) {
    const benchData = benches[benchName];
    const frameworkInfo = frameworks[framework];

    assert(
      `Could not find bench data for bench ${benchName} and framework ${framework}`,
      benchData
    );
    assert(
      `Could not find framework information for the framework named ${framework}. Available known frameworks: ${Object.keys(
        frameworks
      ).join(', ')}`,
      frameworkInfo
    );

    const time = averageOf(benchData);
    list.push({
      name: framework,
      speed: time,
      color: frameworkInfo.color,
    });
  }

  return list.sort((a, b) => a.speed - b.speed);
}

export default Route(
  <template>
    {{pageTitle "Results"}}

    <AnimateResults
      @name="1 item, 10k updates"
      @results={{dataOf "one-item-10k-times"}}
    />
    {{!--
    <AnimateResults
      @name="10k items, 1 update each (sequential)"
      @results={{results.pending}}
    />
    --}}
  </template>
);
