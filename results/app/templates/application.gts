import Route from 'ember-route-template';
import { pageTitle } from 'ember-page-title';
import { AnimateResults } from './results';

/**
 * TODO: add logos
 */
const results = {
  pending: [],
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
    <AnimateResults
      @name="10k items, 1 update each (sequential)"
      @results={{results.pending}}
    />
  </template>
);
