import { LinkTo } from "@ember/routing";

import { Info } from "#components/env.gts";

import type { TOC } from "@ember/component/template-only";
import type { Model } from "#routes/results.ts";

export default <template>
  <nav class="visualizations">
    <LinkTo @route="results.animated">Animated</LinkTo>
    |
    <LinkTo @route="results.index">Table</LinkTo>
    |
    <LinkTo @route="results.boxplot">Boxplot</LinkTo>
  </nav>

  <Info
    @date={{@model.data.date}}
    @sha={{@model.data.sha}}
    @env={{@model.data.environment}}
    @cpuThrottle={{@model.data.args.CPU_THROTTLE}}
    @timing={{@model.data.timing}}
  />

  <div class="all-results">
    {{outlet}}
  </div>
</template> satisfies TOC<{ model: Model }>;
