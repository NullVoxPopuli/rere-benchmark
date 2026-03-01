import { expectTypeOf } from 'expect-type';

import { helpers } from './index.js';
import { OneItem } from './tests/one-item.js';
import { ManyItems } from './tests/many-items.js';
import { DBMonWithChat } from './tests/db-mon-with-chat.js';

type V<Test extends keyof typeof helpers> = ReturnType<(typeof helpers)[Test]>;

expectTypeOf<V<'oneItem10kUpdates'>>().toEqualTypeOf<OneItem>();
expectTypeOf<Parameters<OneItem['doit']>>().toEqualTypeOf<[unknown]>();

expectTypeOf<V<'tenKitems1UpdateEach'>>().toEqualTypeOf<OneItem>();
expectTypeOf<Parameters<ManyItems['doit']>>().toEqualTypeOf<[unknown]>();

expectTypeOf<V<'dbMonWithChat'>>().toEqualTypeOf<DBMonWithChat>();
expectTypeOf<Parameters<DBMonWithChat['doit']>>().toEqualTypeOf<
  [
    {
      handleDbUpdate: (...args: unknown[]) => unknown;
      handleChat: (...args: unknown[]) => unknown;
    },
  ]
>();
