import { OneItem } from './tests/one-item.js';
import { TenKItems } from './tests/ten-k-items.js';

export const helpers = {
  oneItem10kUpdates: () => new OneItem(),
  tenKitems1UpdateEach: () => new TenKItems(),
  tenKitems1UpdateOn25Percent: () =>
    new TenKItems({ random: true, totalUpdates: 2_500 }),
};
