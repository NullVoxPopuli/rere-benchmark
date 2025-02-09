import { expectTypeOf } from 'expect-type';

import { helpers } from './index.js';
import { OneItem } from './tests/one-item.js';
import { TenKItems } from './tests/ten-k-items.js';

type V<Test extends keyof typeof helpers> = ReturnType<(typeof helpers)[Test]>;

expectTypeOf<V<'oneItem10kUpdates'>>().toMatchTypeOf<OneItem>();
expectTypeOf<Parameters<OneItem['run']>>().toMatchTypeOf<
  (item: number) => unknown
>();
expectTypeOf<Parameters<TenKItems['run']>>().toMatchTypeOf<
  (item: number) => unknown
>();
