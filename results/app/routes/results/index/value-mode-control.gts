import Component from "@glimmer/component";
import { service } from "@ember/service";

import type RouterService from "@ember/routing/router-service";
import type QueryParams from "#services/query-params.ts";

export type ValueMode = "raw" | "linear" | "times";

/**
 * The ?mode= query param, wherever a component needs it.
 */
export function modeFrom(qp: QueryParams): ValueMode {
  const mode = qp.get("mode");

  return mode === "linear" || mode === "times" ? mode : "raw";
}

export class ValueModeControl extends Component {
  @service declare router: RouterService;
  @service declare queryParams: QueryParams;

  isMode = (mode: ValueMode) => modeFrom(this.queryParams) === mode;

  setMode = (mode: ValueMode) => {
    this.router.transitionTo({ queryParams: { mode } });
  };

  <template>
    <fieldset class="value-mode surface">
      <legend>values</legend>
      <label>
        <input
          type="radio"
          name="value-mode"
          checked={{this.isMode "raw"}}
          {{on "change" (fn this.setMode "raw")}}
        />
        raw
      </label>
      <label>
        <input
          type="radio"
          name="value-mode"
          checked={{this.isMode "linear"}}
          {{on "change" (fn this.setMode "linear")}}
        />
        score
        <span class="units">(normalized 0 to 1)</span>
      </label>
      <label>
        <input
          type="radio"
          name="value-mode"
          checked={{this.isMode "times"}}
          {{on "change" (fn this.setMode "times")}}
        />
        times best
        <span class="units">(1x is best)</span>
      </label>
    </fieldset>
  </template>
}
