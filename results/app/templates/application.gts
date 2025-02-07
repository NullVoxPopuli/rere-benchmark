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
const frameworks: Record<string, { color: string; logo: string }> = {
  ember: {
    color: '#E04E39',
    logo: '/ember.svg',
  },
  react: {
    color: '#61DBFB',
    logo: '/react.svg',
  },
  solid: {
    color: '#2c4f7c',
    logo: '/solid.svg',
  },
  vue: {
    color: '#42b883',
    logo: '/vue.svg',
  },
  svelte: {
    color: '#ff3e00',
    logo: '/svelte.svg',
  },
};

function averageOf(arrayOfMarks: Array<[Mark, Mark]>) {
  const durations = [];

  for (const pair of arrayOfMarks) {
    const start = pair.find((x) => x.name.endsWith('start'));
    const done = pair.find((x) => x.name.endsWith('done'));

    if (!done || !start) {
      console.log(arrayOfMarks);
      continue;
    }
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
      logo: frameworkInfo.logo,
    });
  }

  return list.sort((a, b) => a.speed - b.speed);
}

export default Route(
  <template>
    {{pageTitle "Results"}}

    <main>
      Tested on 2025-02-07 on
      <ul>
        <li>Ubuntu 24.04 w/ AMD Ryzen 9 7900X / 64GB RAM</li>
        <li>Google Chrome 133.0.6943.53 (non-headless)</li>
        <li>240hz Monitor (1 frame = 4.17ms)</li>
      </ul>

      <div class="all-results">
        <AnimateResults
          @name="1 item, 10k updates"
          @results={{dataOf "one-item-10k-times"}}
        />
        <AnimateResults
          @name="10k items, 1 update each (sequential)"
          @results={{dataOf "ten-k-items-one-time"}}
        />
      </div>
    </main>
  </template>
);
