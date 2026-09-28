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
      /* not .settings: a class named here is renamed at build time, and the
         card grid in app.css finds this panel by that name */
      details {
        justify-self: center;

        /* the panel is chrome, not data: without a cap it inherits the width of
           the widest results table behind it and the cards stretch to match */
        width: min(100%, 60rem);
      }

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
    </style>
  </template>
}
