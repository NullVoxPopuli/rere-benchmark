import Component from "@glimmer/component";
import { service } from "@ember/service";

import { DEFAULT_CURVE, DEFAULT_PERCENTILE } from "#utils";

import type Owner from "@ember/owner";
import type QueryParams from "#services/query-params.ts";

const DEFAULTS: Record<string, string> = {
  mode: "raw",
  p: String(DEFAULT_PERCENTILE),
  curve: String(DEFAULT_CURVE),
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
  </template>
}
