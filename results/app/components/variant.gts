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
</template> satisfies TOC<{
  variant: string | undefined;
}>;
