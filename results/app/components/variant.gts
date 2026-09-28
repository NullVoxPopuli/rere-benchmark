import type { TOC } from "@ember/component/template-only";

/**
 * A framework's variant label (e.g. "Vapor"), shown under the framework
 * name and above its version. Renders nothing when the run recorded no
 * variant for the framework.
 */
export const Variant = <template>
  {{#if @variant}}
    <span class="variant">{{@variant}}</span>
  {{/if}}

  <style scoped>
    /* a block, so it lands on its own line under the name */
    .variant {
      display: block;
      text-align: center;
      font-size: 0.8rem;
      font-weight: 600;
      opacity: 0.75;
    }
  </style>
</template> satisfies TOC<{
  variant: string | undefined;
}>;
