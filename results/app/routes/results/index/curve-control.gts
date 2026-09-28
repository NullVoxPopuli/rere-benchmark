import Component from "@glimmer/component";
import { service } from "@ember/service";

import { curveFrom, DEFAULT_CURVE } from "#utils";

import type RouterService from "@ember/routing/router-service";
import type QueryParams from "#services/query-params.ts";

export class CurveControl extends Component {
  @service declare router: RouterService;
  @service declare queryParams: QueryParams;

  get curve() {
    return curveFrom(this.queryParams);
  }

  setCurve = (event: Event) => {
    const { valueAsNumber } = event.target as HTMLInputElement;

    // Half-typed input is briefly unparseable -- "", "-", "0." --
    // and this fires on every keystroke.
    // Keep the last good curve instead of writing a fallback back into the field,
    // which would eat the keystroke and make a negative impossible to type.
    if (!Number.isFinite(valueAsNumber)) return;

    this.router.transitionTo({
      queryParams: { curve: valueAsNumber === DEFAULT_CURVE ? null : valueAsNumber },
    });
  };

  <template>
    <fieldset class="value-mode surface">
      <legend>color curve</legend>
      <label>
        <input
          type="number"
          name="color-curve"
          step="0.1"
          value={{this.curve}}
          {{on "input" this.setCurve}}
        />
        bend toward best
      </label>
      <span class="units">0 is a straight ramp; negative bends toward the tail</span>
    </fieldset>
  </template>
}
