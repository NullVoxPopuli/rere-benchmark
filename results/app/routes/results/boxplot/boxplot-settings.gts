import { BorrowPicker } from "../borrow-picker.gts";
import { FrameworkToggles } from "../framework-toggles.gts";
import { Settings } from "../settings.gts";
import { SortControl } from "../sort-control.gts";

import type { Borrowed } from "../+route.ts";
import type { TOC } from "@ember/component/template-only";
import type { ResultSet } from "#types";

const settingParams = ["hide", "from", "sort"] as const;

export const BoxplotSettings = <template>
  <Settings @params={{settingParams}}>
    <SortControl />
    <FrameworkToggles @file={{@file}} />
    <BorrowPicker @borrowed={{@borrowed}} />
  </Settings>
</template> satisfies TOC<{
  file: ResultSet;
  borrowed: Borrowed[];
}>;
