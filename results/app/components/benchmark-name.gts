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

  <style scoped>
    /* not .benchmark-name: a class named here is renamed at build time,
       and the value-column widths in app.css skip this cell by that name */
    td {
      /* stays readable while the value columns scroll under it */
      position: sticky;
      left: 0;
      background: var(--page-bg);
      /* cells later in the row otherwise paint over the sticky cell */
      z-index: 1;

      min-width: 11rem;
      text-align: right;
      display: flex;
      justify-content: end;

      .units {
        position: absolute;
        font-size: 0.5rem;
        right: 0.5rem;
        bottom: -0.25rem;
      }
    }
  </style>
</template> satisfies TOC<{
  bench: BenchmarkInfo;
}>;
