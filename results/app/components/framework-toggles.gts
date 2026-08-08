import Component from "@glimmer/component";
import { service } from "@ember/service";

import { nameOf } from "#frameworks";

import type RouterService from "@ember/routing/router-service";
import type { ResultSet } from "#types";

export function hiddenFrameworksFrom(router: RouterService) {
  const raw = router.currentRoute?.queryParams["hide"];

  return typeof raw === "string" && raw.length > 0 ? raw.split(",") : [];
}

export function visibleFrameworksOf(router: RouterService, file: ResultSet) {
  const hidden = hiddenFrameworksFrom(router);

  return file.selections.frameworks.filter((name) => !hidden.includes(name));
}

export class FrameworkToggles extends Component<{
  file: ResultSet;
}> {
  @service declare router: RouterService;

  isShown = (name: string) => !hiddenFrameworksFrom(this.router).includes(name);

  toggle = (name: string, event: Event) => {
    const { checked } = event.target as HTMLInputElement;
    const hidden = hiddenFrameworksFrom(this.router).filter((entry) => entry !== name);

    if (!checked) hidden.push(name);

    this.router.transitionTo({ queryParams: { hide: hidden.join(",") || null } });
  };

  <template>
    <fieldset class="value-mode surface">
      <legend>frameworks</legend>
      {{#each @file.selections.frameworks as |name|}}
        <label>
          <input
            type="checkbox"
            name="show-{{name}}"
            checked={{this.isShown name}}
            {{on "change" (fn this.toggle name)}}
          />
          {{nameOf name}}
        </label>
      {{/each}}
    </fieldset>
  </template>
}
