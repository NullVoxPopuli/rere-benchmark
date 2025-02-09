import { dataOf } from '#utils';
import { Visualize } from '#components/visualize.gts';
import type { Model } from '#routes/results.ts';
import type { TOC } from '@ember/component/template-only';
import type { ResultData } from '#types';

const msInOneHz = 1_000;

function msOfFrameAt(hz: number) {
  const result = msInOneHz / hz;

  return Math.round(result * 100) / 100;
}

const Info = <template>
  Tested on
  {{@date}}
  with:
  <ul>
    <li>
      {{@env.machine.os.name}}
      {{@env.machine.os.version}}
      w/
      {{@env.machine.cpu}}
      /
      {{@env.machine.ram}}
      RAM
    </li>
    <li>
      {{@env.browser.name}}
      {{@env.browser.version}}
      (non-headless)
    </li>
    <li>
      {{@env.monitor.hz}}hz Monitor (1 frame =
      {{msOfFrameAt @env.monitor.hz}}ms)
    </li>
  </ul>
</template> satisfies TOC<{
  date: Model['data']['date'];
  env: Model['data']['environment'];
}>;

function allHave(results: ResultData, key: string) {
  return Object.entries(results).every(([, benches]) => Boolean(benches[key]));
}

const ShowIfAllPresent = <template>
  {{#if (allHave @results @name)}}
    <Visualize @name={{@name}} @results={{dataOf @results @name}} />
  {{/if}}
</template> satisfies TOC<{
  results: Model['data']['results'];
  name: string;
  key: string;
}>;

function getBenchNames(results: ResultData) {
  const names = new Set();

  Object.values(results)
    .map(Object.keys)
    .forEach((name) => names.add(name));

  return [...names.values()].flat();
}

export default <template>
  <Info @date={{@model.data.date}} @env={{@model.data.environment}} />

  <div class="all-results">
    {{#each (getBenchNames @model.data.results) as |name|}}
      {{log name}}
      <ShowIfAllPresent @name={{name}} @results={{@model.data.results}} />
    {{/each}}
  </div>
</template> satisfies TOC<{ model: Model }>;
