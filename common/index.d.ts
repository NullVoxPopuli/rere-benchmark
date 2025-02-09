import { OneItem } from './tests/one-item.js';
import { TenKItems } from './tests/ten-k-items.js';

export const helpers: {
  oneItem10kUpdates: () => OneItem;
  tenKitems1UpdateEach: () => TenKItems;
  tenKitems1UpdateOn25Percent: () => TenKItems;
};
