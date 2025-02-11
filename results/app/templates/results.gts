import type { Model } from '#routes/results.ts';
import type { TOC } from '@ember/component/template-only';
import { Info } from '#components/env.gts';
import { LinkTo } from '@ember/routing';

export default <template>
  <nav class="visualizations">
    <LinkTo @route="results.animated">Animated</LinkTo>
    |
    <LinkTo @route="results.index">Table</LinkTo>
  </nav>

  <Info @date={{@model.data.date}} @env={{@model.data.environment}} />

  <div class="all-results">
    {{outlet}}
  </div>
</template> satisfies TOC<{ model: Model }>;
