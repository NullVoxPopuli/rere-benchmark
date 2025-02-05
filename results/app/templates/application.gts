import Route from 'ember-route-template';
import { pageTitle } from 'ember-page-title';

import Component from '@glimmer/component';

/**
 * TODO: add logos
 */
class AnimateResults extends Component {
  <template>
    <section class="languages-container">
      <h2>1 item, 10k updates</h2>

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
  </template>
}

const results = {
  one10ku: [
    { name: 'Ember', color: '#E04E39', speed: 1 },
    { name: 'React', color: '#61DBFB', speed: 4 },
  ],
};

export default Route(
  <template>
    {{pageTitle "Results"}}

    <AnimateResults @results={{results.one10ku}} />
  </template>
);
