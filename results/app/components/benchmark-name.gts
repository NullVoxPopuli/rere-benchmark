import type { TOC } from "@ember/component/template-only";
import type { BenchmarkInfo } from "#types";

/**
 * The row label in a table of results: what was measured, with the units
 * it was measured in tucked underneath.
 */
export const BenchmarkName = <template>
  <td class="benchmark-name">
    {{@bench.name}}
    <span class="units">
      (
      {{@bench.units}}
      )
    </span>
  </td>
</template> satisfies TOC<{
  bench: BenchmarkInfo;
}>;
