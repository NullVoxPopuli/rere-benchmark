import { assert } from "@ember/debug";

import { type FrameworkInfo as Info, frameworks } from "#frameworks";

import type { TOC } from "@ember/component/template-only";

function infoFor(name: string): Info {
  const info = frameworks[name];

  assert(`Expected ${name} to be one of ${Object.keys(frameworks).join(", ")}`, info);

  return info;
}

export const FrameworkInfo = <template>
  {{#let (infoFor @name) as |info|}}
    <a href={{info.url}} class="fw-info" target="_blank" rel="noopener noreferrer">
      <img alt="" width="32" src={{info.logo}} />
      <span>{{info.name}}</span>
    </a>
  {{/let}}
</template> satisfies TOC<{
  name: string;
}>;
