import { expectTypeOf } from 'expect-type';

import { helpers } from './index.js';
import { OneItem } from './tests/one-item.js';
import { ManyItems } from './tests/many-items.js';
import { DBMonWithChat } from './tests/db-mon-with-chat.js';
import type { ChatUpdate, DBUpdate } from './tests/dbmon/types.ts';

type V<Test extends keyof typeof helpers> = ReturnType<(typeof helpers)[Test]>;

expectTypeOf<V<'oneItem10kUpdates'>>().toEqualTypeOf<OneItem>();
expectTypeOf<Parameters<OneItem['doit']>>().toEqualTypeOf<
  [(value: number) => unknown]
>();

expectTypeOf<V<'tenKitems1UpdateEach'>>().toEqualTypeOf<ManyItems>();
expectTypeOf<Parameters<ManyItems['doit']>>().toEqualTypeOf<
  [(index: number) => unknown]
>();

expectTypeOf<V<'dbMonWithChat'>>().toEqualTypeOf<DBMonWithChat>();
expectTypeOf<Parameters<DBMonWithChat['doit']>>().toEqualTypeOf<
  [
    {
      handleDbUpdate: (update: DBUpdate) => unknown;
      handleChat: (update: ChatUpdate) => unknown;
    },
  ]
>();
