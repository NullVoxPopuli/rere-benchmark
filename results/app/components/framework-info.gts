import { infoFor } from "#frameworks";

import type { TOC } from "@ember/component/template-only";

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
