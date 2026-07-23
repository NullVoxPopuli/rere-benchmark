import type { TOC } from "@ember/component/template-only";
import type { VersionOverride } from "#types";

/**
 * Renders a framework's version label. When a {@link VersionOverride} is
 * provided, a link (e.g. to the PR the build came from) is shown in place of
 * the plain version number.
 */
export const Version = <template>
  {{#if @override}}
    <a href={{@override.url}} target="_blank" rel="noopener noreferrer">
      #{{@override.number}}
    </a>
  {{else}}
    {{@version}}
  {{/if}}
</template> satisfies TOC<{
  version: string | undefined;
  override: VersionOverride | undefined;
}>;
