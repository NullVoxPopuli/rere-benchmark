import Component from "@glimmer/component";
import { service } from "@ember/service";

import { DEFAULT_CURVE, DEFAULT_PERCENTILE } from "#utils";

import type Owner from "@ember/owner";
import type RouterService from "@ember/routing/router-service";

const DEFAULTS: Record<string, string> = {
  mode: "raw",
  p: String(DEFAULT_PERCENTILE),
  curve: String(DEFAULT_CURVE),
};

function hasNonDefaults(router: RouterService, params: string[]) {
  const qps = router.currentRoute?.queryParams ?? {};

  return params.some((param) => {
    const value = qps[param];

    return value !== undefined && value !== "" && value !== DEFAULTS[param];
  });
}

export class Settings extends Component<{
  Args: { params: string[] };
  Blocks: { default: [] };
}> {
  @service declare router: RouterService;

  open: boolean;

  constructor(owner: Owner, args: { params: string[] }) {
    super(owner, args);
    this.open = hasNonDefaults(this.router, args.params);
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
