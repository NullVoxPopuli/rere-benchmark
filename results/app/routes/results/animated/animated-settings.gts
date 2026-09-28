import { BorrowPicker } from "../borrow-picker.gts";
import { FrameworkToggles } from "../framework-toggles.gts";
import { PercentileControl } from "../percentile-control.gts";
import { Settings } from "../settings.gts";

import type { Borrowed } from "../+route.ts";
import type { TOC } from "@ember/component/template-only";
import type { ResultSet } from "#types";

// no sort control: the rows already order themselves by measured speed
const settingParams = ["p", "hide", "from"] as const;

export const AnimatedSettings = <template>
  <Settings @params={{settingParams}}>
    <PercentileControl />
    <FrameworkToggles @file={{@file}} />
    <BorrowPicker @borrowed={{@borrowed}} />
  </Settings>
</template> satisfies TOC<{
  file: ResultSet;
  borrowed: Borrowed[];
}>;
