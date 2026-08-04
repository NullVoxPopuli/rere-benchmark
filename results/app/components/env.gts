import { displayHz, formatDuration, formatTimestamp, msOfFrameAt } from "#utils";

import type { TOC } from "@ember/component/template-only";
import type { ResultSet } from "#result-set";

function first8(str: string) {
  return str.slice(0, 8);
}

function isThrottled(cpuThrottle: number | undefined) {
  return typeof cpuThrottle === "number" && cpuThrottle > 1;
}

export const Info = <template>
  <div class="env-info">
    Tested on
    <time datetime={{@set.date}}>{{formatTimestamp @set.date}}</time>

    {{#if @set.sha}}
      <span>
        @
        <a
          target="_blank"
          href="https://github.com/NullVoxPopuli/rere-benchmark/tree/{{@set.sha}}"
          rel="noopener noreferrer"
        >
          {{first8 @set.sha}}
        </a>
      </span>
    {{/if}}
    with:
    <ul>
      <li>
        {{@set.environment.machine.os.name}}
        {{@set.environment.machine.os.version}}
        w/
        {{@set.environment.machine.cpu}}
        /
        {{@set.environment.machine.ram}}
        RAM
      </li>
      <li>
        {{@set.environment.browser.name}}
        {{@set.environment.browser.version}}
        (non-headless)
      </li>
      <li>
        {{displayHz @set.environment.monitor.hz}}hz Monitor (1 frame =
        {{msOfFrameAt @set.environment.monitor.hz}}ms)
      </li>
      {{#if (isThrottled @set.cpuThrottle)}}
        <li>
          {{@set.throttleLabel}}
        </li>
      {{/if}}
      {{#if @set.timing}}
        <li>
          Ran in
          {{formatDuration @set.timing.totalMs}}
          {{#if @set.timing.buildMs}}
            (build:
            {{formatDuration @set.timing.buildMs}}, benchmark:
            {{formatDuration @set.timing.benchmarkMs}})
          {{else}}
            (benchmark only; build skipped)
          {{/if}}
        </li>
      {{/if}}
    </ul>

    {{#if @set.prs.length}}
      <details class="pr-notes">
        <summary>PRs since the previous result set ({{@set.prs.length}})</summary>
        <ul>
          {{#each @set.prs as |pr|}}
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
  set: ResultSet;
}>;
