import { assert } from '@ember/debug';
import type { Mark } from '#types';
import { frameworks } from '../../frameworks.ts';

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

export function dataOf(benchName: string) {
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
