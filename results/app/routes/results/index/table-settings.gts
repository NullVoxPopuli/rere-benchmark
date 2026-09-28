import { BorrowPicker } from "../borrow-picker.gts";
import { FrameworkToggles } from "../framework-toggles.gts";
import { PercentileControl } from "../percentile-control.gts";
import { Settings } from "../settings.gts";
import { SortControl } from "../sort-control.gts";
import { CurveControl } from "./curve-control.gts";
import { TableSplits } from "./table-splits.gts";
import { ValueModeControl } from "./value-mode-control.gts";

import type { Borrowed } from "../+route.ts";
import type { TOC } from "@ember/component/template-only";
import type { BenchmarkInfo, ResultSet } from "#types";

const settingParams = ["mode", "p", "hide", "from", "sort", "curve", "split"] as const;

export const TableSettings = <template>
  <Settings @params={{settingParams}}>
    <ValueModeControl />
    <PercentileControl />
    <CurveControl />
    <SortControl />
    <TableSplits @benchmarkInfo={{@benchmarkInfo}} />
    <FrameworkToggles @file={{@file}} />
    <BorrowPicker @borrowed={{@borrowed}} />
  </Settings>
</template> satisfies TOC<{
  benchmarkInfo: BenchmarkInfo[];
  file: ResultSet;
  borrowed: Borrowed[];
}>;
