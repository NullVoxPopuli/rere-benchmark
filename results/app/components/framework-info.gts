import { frameworks, type FrameworkInfo as Info } from '#frameworks';
import type { TOC } from '@ember/component/template-only';
import { assert } from '@ember/debug';

function infoFor(name: string): Info {
  assert(
    `Expected ${name} to be one of ${Object.keys(frameworks).join(', ')}`,
    Object.keys(frameworks).includes(name)
  );
  return frameworks[name as keyof Info]!;
}

export const FrameworkInfo = <template>
  {{#let (infoFor @name) as |info|}}
    <a
      href={{info.url}}
      class="fw-info"
      target="_blank"
      rel="noopener noreferrer"
    >
      <img alt="" width="32" src={{info.logo}} />
      <span>{{info.name}}</span>
    </a>
  {{/let}}
</template> satisfies TOC<{
  name: string;
}>;
