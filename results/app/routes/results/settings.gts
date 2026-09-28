import Component from "@glimmer/component";
import { service } from "@ember/service";

import { DEFAULT_CURVE, DEFAULT_PERCENTILE, DEFAULT_SORT } from "#utils";

import type Owner from "@ember/owner";
import type RouterService from "@ember/routing/router-service";
import type QueryParams from "#services/query-params.ts";

const DEFAULTS: Record<string, string> = {
  mode: "raw",
  p: String(DEFAULT_PERCENTILE),
  curve: String(DEFAULT_CURVE),
  sort: DEFAULT_SORT,
};

/**
 * Every results query param except `q`, the run on screen.
 * Reset clears them all, including the ones this page does not show,
 * so a setting from another view does not linger.
 */
const RESETTABLE = ["mode", "p", "curve", "sort", "split", "hide", "from", "col"];

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
  @service declare router: RouterService;
  @service declare queryParams: QueryParams;

  open: boolean;

  constructor(owner: Owner, args: { params: readonly string[] }) {
    super(owner, args);
    this.open = hasNonDefaults(this.queryParams, args.params);
  }

  get nothingToReset() {
    return RESETTABLE.every((param) => this.queryParams.get(param) === undefined);
  }

  reset = () => {
    const queryParams: Record<string, null> = {};

    for (const param of RESETTABLE) {
      queryParams[param] = null;
    }

    this.router.transitionTo({ queryParams });
  };

  <template>
    <details class="settings" open={{this.open}}>
      <summary>settings</summary>
      <div class="fields">
        {{yield}}
      </div>
      <button type="button" disabled={{this.nothingToReset}} {{on "click" this.reset}}>
        reset
      </button>
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

      /* the same quiet chrome as the summary, under the cards */
      button {
        display: block;
        margin: var(--gap-2) auto 0;
        cursor: pointer;
        padding: var(--padding-1) var(--padding-4);
        font-family: inherit;
        font-size: 0.7rem;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: inherit;
        background: transparent;
        opacity: 0.7;
        border: var(--border-width) var(--border-style) var(--border-color);
        border-radius: var(--radius);

        &:hover:not(:disabled),
        &:focus-visible {
          opacity: 1;
          border-color: color-mix(in oklch, currentColor 40%, var(--border-color));
        }

        &:disabled {
          cursor: default;
          opacity: 0.35;
        }
      }
    </style>
  </template>
}
