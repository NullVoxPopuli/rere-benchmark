import { LinkTo } from "@ember/routing";

import { prsOf } from "#utils";

import { Info } from "./env.gts";

import type { Model } from "./+route.ts";
import type { TOC } from "@ember/component/template-only";

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
    @prs={{prsOf @model.data}}
  />

  <div class="all-results">
    {{outlet}}
  </div>
</template> satisfies TOC<{ model: Model }>;
