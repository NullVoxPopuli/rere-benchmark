import { expectTypeOf } from 'expect-type';

import { helpers } from './index.js';
import { OneItem } from './tests/one-item.js';
import { ManyItems } from './tests/many-items.js';

type V<Test extends keyof typeof helpers> = ReturnType<(typeof helpers)[Test]>;

expectTypeOf<V<'oneItem10kUpdates'>>().toMatchTypeOf<OneItem>();
expectTypeOf<Parameters<OneItem['run']>>().toMatchTypeOf<
  (item: number) => unknown
>();
expectTypeOf<Parameters<ManyItems['run']>>().toMatchTypeOf<
  (item: number) => unknown
>();
