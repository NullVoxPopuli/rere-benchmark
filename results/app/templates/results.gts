import type { TOC } from '@ember/component/template-only';

import type { Results } from './types.ts';

export const AnimateResults = <template>
  <section class="languages-container">
    <h2>{{@name}}</h2>

    <table>
      <thead></thead>

      <tbody>
        {{#each @results as |lang|}}
          <tr>
            <td>{{lang.name}}</td>
            <td>
              <svg width="400" height="48" viewBox="0 0 400 48">
                <circle cx="50" cy="24" r="10" fill={{lang.color}}>
                  <animate
                    attributeName="cx"
                    values="50; 350; 50"
                    keyTimes="0; 0.5; 1"
                    dur="{{@scaleTime lang.speed}}ms"
                    repeatCount="indefinite"
                  />
                </circle>
              </svg>
            </td>
          </tr>
        {{/each}}
      </tbody>
    </table>
  </section>

  <style>
    tr td { border-bottom: 1px solid; }
  </style>
</template> satisfies TOC<{
  name: string;
  results: Results;
  scaleTime: (ms: number) => number;
}>;
