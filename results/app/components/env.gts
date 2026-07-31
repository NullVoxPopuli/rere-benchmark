import { displayHz, formatDuration, formatTimestamp, msOfFrameAt, throttleLabel } from "#utils";

import type { TOC } from "@ember/component/template-only";
import type { ResultSet } from "#types";
import type { DisplayPr } from "#utils";

function first8(str: string) {
  return str.slice(0, 8);
}

function isThrottled(cpuThrottle: number | undefined) {
  return typeof cpuThrottle === "number" && cpuThrottle > 1;
}

export const Info = <template>
  <div class="env-info">
    Tested on
    <time datetime={{@date}}>{{formatTimestamp @date}}</time>

    {{#if @sha}}
      <span>
        @
        <a
          target="_blank"
          href="https://github.com/NullVoxPopuli/rere-benchmark/tree/{{@sha}}"
          rel="noopener noreferrer"
        >
          {{first8 @sha}}
        </a>
      </span>
    {{/if}}
    with:
    <ul>
      <li>
        {{@env.machine.os.name}}
        {{@env.machine.os.version}}
        w/
        {{@env.machine.cpu}}
        /
        {{@env.machine.ram}}
        RAM
      </li>
      <li>
        {{@env.browser.name}}
        {{@env.browser.version}}
        (non-headless)
      </li>
      <li>
        {{displayHz @env.monitor.hz}}hz Monitor (1 frame =
        {{msOfFrameAt @env.monitor.hz}}ms)
      </li>
      {{#if (isThrottled @cpuThrottle)}}
        <li>
          {{throttleLabel @cpuThrottle}}
        </li>
      {{/if}}
      {{#if @timing}}
        <li>
          Ran in
          {{formatDuration @timing.totalMs}}
          {{#if @timing.buildMs}}
            (build:
            {{formatDuration @timing.buildMs}}, benchmark:
            {{formatDuration @timing.benchmarkMs}})
          {{else}}
            (benchmark only; build skipped)
          {{/if}}
        </li>
      {{/if}}
    </ul>

    {{#if @prs.length}}
      <details class="pr-notes">
        <summary>PRs since the previous result set ({{@prs.length}})</summary>
        <ul>
          {{#each @prs as |pr|}}
            <li>
              <a target="_blank" rel="noopener noreferrer" href={{pr.url}}>
                {{pr.label}}
              </a>
              {{#if pr.title}}{{pr.title}}{{/if}}
            </li>
          {{/each}}
        </ul>
      </details>
    {{/if}}
  </div>
</template> satisfies TOC<{
  date: string;
  sha: string;
  env: ResultSet["environment"];
  cpuThrottle: number | undefined;
  timing: ResultSet["timing"];
  prs: DisplayPr[];
}>;
