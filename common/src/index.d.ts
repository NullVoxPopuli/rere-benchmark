import { OneItem } from './tests/one-item.js';
import { ManyItems } from './tests/many-items.js';
import { DBMonWithChat } from './tests/db-mon-with-chat.js';
import { IncrementingRenderEffect } from './tests/incrementing-render-effect.js';
import { FanOut } from './tests/fan-out.js';

export const helpers: {
  oneItem10kUpdates: () => OneItem;
  tenKitems1UpdateEach: () => ManyItems;
  dbMonWithChat: () => DBMonWithChat;
  incrementingRenderEffect: () => IncrementingRenderEffect;
  fanOut: () => FanOut;
};

export type {
  Row as DBRow,
  ChatMessage,
  DBUpdate,
  ChatUpdate,
} from './tests/dbmon/types.ts';
