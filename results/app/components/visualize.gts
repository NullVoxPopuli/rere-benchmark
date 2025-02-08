import type { TOC } from '@ember/component/template-only';

import type { Results } from '#types';
import { assert } from '@ember/debug';
import { FrameworkInfo } from './framework-info';

function scaleFactor(results: Results) {
  const fastest = results[0];
  assert(`Results are empty`, fastest);

  const scale = fastest.speed;
  return (ms: number) => ms / scale;
}

function round(ms: number) {
  return Math.round(ms * 100) / 100;
}

export const Visualize = <template>
  <section class="languages-container">
    <h2>{{@name}}</h2>

    <table>
      <thead></thead>

      <tbody>
        {{#let (scaleFactor @results) as |scaleTime|}}
          {{#each @results as |fw|}}
            <tr>
              <td>
                <FrameworkInfo @name={{fw.name}} />
              </td>
              <td class="time">{{round fw.speed}}ms</td>
              <td>
                <svg width="400" height="48" viewBox="0 0 400 48">
                  <circle cx="50" cy="24" r="10" fill={{fw.color}}>
                    <animate
                      attributeName="cx"
                      values="50; 350; 50"
                      keyTimes="0; 0.5; 1"
                      dur="{{scaleTime fw.speed}}s"
                      repeatCount="indefinite"
                    />
                  </circle>
                </svg>
              </td>
            </tr>
          {{/each}}
        {{/let}}
      </tbody>
    </table>
  </section>

  <style>
    tr td {
      border-bottom: 1px solid lightgray;
    }
    .time {
      font-style: italic;
      padding: 0 0.5rem;
    }
  </style>
</template> satisfies TOC<{
  name: string;
  results: Results;
}>;
