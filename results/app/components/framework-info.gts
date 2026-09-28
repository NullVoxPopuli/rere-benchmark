import { infoFor } from "#frameworks";

import type { TOC } from "@ember/component/template-only";

export const FrameworkInfo = <template>
  {{#let (infoFor @name) as |info|}}
    <a href={{info.url}} class="fw-info" target="_blank" rel="noopener noreferrer">
      <img alt="" width="32" src={{info.logo}} />
      <span>{{info.name}}</span>
    </a>
  {{/let}}

  <style scoped>
    .fw-info {
      display: grid;
      justify-items: center;
      align-content: center;
      gap: 0.25rem;
      text-decoration: none;
      color: currentColor;

      &:hover {
        text-decoration: underline;
      }

      img {
        width: 32px;
        height: 32px;
        object-fit: contain;
      }

      span {
        font-size: 0.8rem;
        white-space: nowrap;
      }
    }
  </style>
</template> satisfies TOC<{
  name: string;
}>;
