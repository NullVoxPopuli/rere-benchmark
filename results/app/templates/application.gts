import Route from 'ember-route-template';
import { pageTitle } from 'ember-page-title';

import type { TOC } from '@ember/component/template-only';

const AnimateResults = <template>
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
                    dur="{{lang.speed}}s"
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
</template> satisfies TOC<{ name: string; results: Results }>;

/**
 * TODO: add logos
 */
type Results = Result[];
interface Result {
  name: string;
  color: string;
  speed: number;
}

const results = {
  // NOTE: these are not real values atm
  //       they *could be*, but I'm not ready to claim that they are until
  //       I get start automating the read of perf.mark()
  //       + using my desktop
  //       + using my 240hz monitor
  one10ku: [
    { name: 'Ember', color: '#E04E39', speed: 1 },
    { name: 'React', color: '#61DBFB', speed: 4 },
    { name: 'Solid', color: '#2c4f7c', speed: 15 },
    { name: 'Vue', color: '#42b883', speed: 14 },
    { name: 'Svelte', color: '#ff3e00', speed: 10 },
  ],
};

export default Route(
  <template>
    {{pageTitle "Results"}}

    <AnimateResults @name="1 item, 10k updates" @results={{results.one10ku}} />
  </template>
);
