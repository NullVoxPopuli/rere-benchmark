import { OneItem } from './tests/one-item.js';
import { ManyItems } from './tests/many-items.js';
import { DBMonWithChat } from './tests/db-mon-with-chat.js';

export { qpNum, qp, qpPercent, qpBool } from './tests/utils.js';

export const helpers = {
  oneItem10kUpdates: () => new OneItem(),
  tenKitems1UpdateEach: () => new ManyItems(),
  dbMonWithChat: () => new DBMonWithChat(),
};
