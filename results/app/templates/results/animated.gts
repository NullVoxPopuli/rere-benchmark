import { dataOf, getBenchNames } from '#utils';
import { Visualize } from '#components/visualize.gts';
import type { Model } from '#routes/results.ts';
import type { TOC } from '@ember/component/template-only';
import { Info } from '#components/env.gts';

export default <template>
  <Info @date={{@model.data.date}} @env={{@model.data.environment}} />

  <div class="all-results">
    {{#each (getBenchNames @model.data.results) as |name|}}
      <Visualize @name={{name}} @results={{dataOf @model.data.results name}} />
    {{/each}}
  </div>
</template> satisfies TOC<{ model: Model }>;
