import Component from "@glimmer/component";
import { service } from "@ember/service";

import { DEFAULT_CURVE, DEFAULT_PERCENTILE, DEFAULT_SORT } from "#utils";

import type Owner from "@ember/owner";
import type QueryParams from "#services/query-params.ts";

const DEFAULTS: Record<string, string> = {
  mode: "raw",
  p: String(DEFAULT_PERCENTILE),
  curve: String(DEFAULT_CURVE),
  sort: DEFAULT_SORT,
};

function hasNonDefaults(qp: QueryParams, params: readonly string[]) {
  return params.some((param) => {
    const value = qp.get(param);

    return value !== undefined && value !== DEFAULTS[param];
  });
}

export class Settings extends Component<{
  Args: { params: readonly string[] };
  Blocks: { default: [] };
}> {
  @service declare queryParams: QueryParams;

  open: boolean;

  constructor(owner: Owner, args: { params: readonly string[] }) {
    super(owner, args);
    this.open = hasNonDefaults(this.queryParams, args.params);
  }

  <template>
    <details class="settings" open={{this.open}}>
      <summary>settings</summary>
      <div class="fields">
        {{yield}}
      </div>
    </details>

    <style scoped>
      .settings {
        justify-self: center;

        /* the panel is chrome, not data: without a cap it inherits the width of
           the widest results table behind it and the cards stretch to match */
        width: min(100%, 60rem);

        summary {
          width: fit-content;
          margin-inline: auto;
          cursor: pointer;
          padding: var(--padding-1) var(--padding-4);
          font-size: 0.7rem;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          opacity: 0.7;
          border: var(--border-width) var(--border-style) var(--border-color);
          border-radius: var(--radius);

          &:hover,
          &:focus-visible {
            opacity: 1;
            border-color: color-mix(in oklch, currentColor 40%, var(--border-color));
          }
        }

        /* one card per group, as many across as fit. Each card is its own
           fieldset, so a group never splits across a column boundary. */
        .fields {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(min(100%, 17rem), 1fr));
          align-items: start;
          gap: var(--gap-4);
          padding-top: var(--padding-4);
        }

        /* the cards come from the caller's block, so they are not elements of
           this template. The stacked layout spaced its groups with margins;
           the grid's own gutters do that now. */
        .fields > * {
          margin-bottom: 0;

          /* a grid item's floor is its content, so the borrow card's <select>
             would push its column -- and the centred panel -- out of line */
          min-width: 0;
          max-width: none;
        }

        /* the run names are long; let the control shrink to its card instead of
           sizing the card to the longest name. Both the label and the select
           need the floor lifted -- each is a flex item whose automatic minimum
           is its own content. */
        .fields :global(label) {
          min-width: 0;
        }

        .fields :global(select) {
          min-width: 0;
          max-width: 100%;
        }
      }
    </style>
  </template>
}
