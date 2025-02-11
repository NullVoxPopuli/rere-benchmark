import { dataOf, getBenchNames } from '#utils';
import { Visualize } from '#components/visualize.gts';
import type { Model } from '#routes/results.ts';
import type { TOC } from '@ember/component/template-only';

export default <template>
  {{#each (getBenchNames @model.data.results) as |name|}}
    <Visualize @name={{name}} @results={{dataOf @model.data.results name}} />
  {{/each}}
</template> satisfies TOC<{ model: Model }>;
