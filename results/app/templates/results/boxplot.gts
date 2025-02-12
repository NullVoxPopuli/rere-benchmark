import { dataOf, getBenchNames } from '#utils';
import { Visualize } from '#components/visualize.gts';
import type { Model } from '#routes/results.ts';
import type { TOC } from '@ember/component/template-only';
/**
 * Boxplot:
 *   (all placements approx)
 *
 *     -----   <- max
 *       |
 *       |
 *       |
 *     -----   <- q3
 *     |   |
 *     |---|   <- median
 *     |   |
 *     |   |
 *     -----   <- q1
 *       |
 *       |
 *       |
 *     -----   <- min
 */

export default <template>
  {{#each (getBenchNames @model.data.results) as |name|}}
    <Visualize @name={{name}} @results={{dataOf @model.data.results name}} />
  {{/each}}
</template> satisfies TOC<{ model: Model }>;
