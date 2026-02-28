import { OneItem } from './tests/one-item.js';
import { TenKItems } from './tests/ten-k-items.js';
import { DBMonWithChat } from './tests/db-mon-with-chat.js';

export const helpers: {
  oneItem10kUpdates: () => OneItem;
  tenKitems1UpdateEach: () => TenKItems;
  dbMonWithChat: () => DBMonWithChat;
};
