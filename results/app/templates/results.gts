import { dataOf } from '#utils';
import { Visualize } from '#components/visualize.gts';
import type { Model } from '#routes/results.ts';
import type { TOC } from '@ember/component/template-only';

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

export default <template>
  <Info @date={{@model.data.date}} @env={{@model.data.environment}} />

  <div class="all-results">
    <Visualize
      @name="1 item, 10k updates"
      @results={{dataOf @model.data.results "one-item-10k-times"}}
    />
    <Visualize
      @name="10k items, 1 update each (sequential)"
      @results={{dataOf @model.data.results "ten-k-items-one-time"}}
    />
  </div>
</template> satisfies TOC<{ model: Model }>;
