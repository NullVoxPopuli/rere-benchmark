import Component from "@glimmer/component";
import { service } from "@ember/service";

import { DEFAULT_PERCENTILE } from "#utils";

import type Owner from "@ember/owner";
import type RouterService from "@ember/routing/router-service";

function hasNonDefaults(router: RouterService) {
  const qps = router.currentRoute?.queryParams ?? {};

  if (qps["from"]) return true;
  if (qps["mode"] !== undefined && qps["mode"] !== "raw") return true;
  if (qps["p"] !== undefined && qps["p"] !== String(DEFAULT_PERCENTILE)) return true;

  return false;
}

export class Settings extends Component<{
  Blocks: { default: [] };
}> {
  @service declare router: RouterService;

  open: boolean;

  constructor(owner: Owner, args: object) {
    super(owner, args);
    this.open = hasNonDefaults(this.router);
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
