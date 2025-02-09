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
  {{#if (allHave @results @key)}}
    <Visualize @name={{@name}} @results={{dataOf @results @key}} />
  {{/if}}
</template> satisfies TOC<{
  results: Model['data']['results'];
  name: string;
  key: string;
}>;

export default <template>
  <Info @date={{@model.data.date}} @env={{@model.data.environment}} />

  <div class="all-results">
    <ShowIfAllPresent
      @key="one-item-10k-times"
      @name="1 item, 10k updates"
      @results={{@model.data.results}}
    />
    <ShowIfAllPresent
      @key="ten-k-items-one-time"
      @name="10k items, 1 update each (sequential)"
      @results={{@model.data.results}}
    />
    <ShowIfAllPresent
      @key="ten-k-items-one-time-25p"
      @name="10k items, 1 update on 25% (random)"
      @results={{@model.data.results}}
    />
  </div>
</template> satisfies TOC<{ model: Model }>;
