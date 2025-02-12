import { msOfFrameAt } from '#utils';
import type { ResultSet } from '#types';
import type { TOC } from '@ember/component/template-only';

export const Info = <template>
  <div class="env-info">
    Tested on
    {{@date}}
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
  env: ResultSet['environment'];
}>;
