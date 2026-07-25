import { LinkTo } from "@ember/routing";

import { results } from "virtual:result-sets";

import { frameworks } from "#frameworks";

import type { TOC } from "@ember/component/template-only";

/**
 * With only one run on the site there is nothing to compare against.
 */
const canCompare = results.length > 1;

function query(framework: string, run: string) {
  // the run being viewed is the candidate; the compare route fills in
  // the run before it as the baseline
  return { framework, b: run };
}

function labelFor(framework: string) {
  return `Compare ${frameworks[framework]?.name ?? framework} against another run`;
}

/**
 * Jumps to the compare page for one framework, from wherever a single
 * run is being viewed.
 */
export const CompareLink = <template>
  {{#if canCompare}}
    <LinkTo
      @route="compare"
      @query={{query @framework @run}}
      class="compare-link"
      title={{labelFor @framework}}
      aria-label={{labelFor @framework}}
    >
      {{! compare-arrows }}
      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
        <path d="M9.01 14H2v2h7.01v3L13 15l-3.99-4v3zm5.98-1v-3H22V8h-7.01V5L11 9l3.99 4z"></path>
      </svg>
    </LinkTo>
  {{/if}}
</template> satisfies TOC<{
  framework: string;
  run: string;
}>;
