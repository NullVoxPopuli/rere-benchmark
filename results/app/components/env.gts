import { msOfFrameAt } from '#utils';
import type { ResultSet } from '#types';
import type { TOC } from '@ember/component/template-only';

function first8(str: string) {
  return str.slice(0, 8);
}

function dateOf(datetime: string) {
  return new Intl.DateTimeFormat('en-CA').format(new Date(datetime));
}

export const Info = <template>
  <div class="env-info">
    Tested on
    <time datetime={{@date}}>{{dateOf @date}}</time>

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
        {{@env.monitor.hz}}hz Monitor (1 frame =
        {{msOfFrameAt @env.monitor.hz}}ms)
      </li>
    </ul>
  </div>
</template> satisfies TOC<{
  date: string;
  sha: string;
  env: ResultSet['environment'];
}>;
