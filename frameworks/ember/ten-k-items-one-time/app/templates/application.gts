import Route from 'ember-route-template';
import Component from '@glimmer/component';
import { helpers } from 'common';
import { TrackedArray } from 'tracked-built-ins';

const test = helpers.tenKitems1UpdateEach();

import {
  consumeTag,
  createUpdatableTag,
  dirtyTag,
} from '../../node_modules/ember-source/dist/packages/@glimmer/validator/index.js';

type Equality<T> = (a: T, b: T) => boolean;

export class Cell<Value> {
  static create<T>(value: T, equals: Equality<T> = Object.is): Cell<T> {
    return new Cell(value, equals);
  }

  #value: Value;
  readonly #equals?: Equality<Value>;
  readonly #tag: UpdatableTag;

  private constructor(value: Value, equals: Equality<Value>) {
    this.#value = value;
    this.#equals = equals;
    this.#tag = createUpdatableTag();
  }

  get current() {
    consumeTag(this.#tag);

    return this.#value;
  }

  read(): Value {
    consumeTag(this.#tag);

    return this.#value;
  }

  set(value: Value): boolean {
    if (this.#equals?.(this.#value, value)) {
      return false;
    }

    this.#value = value;

    dirtyTag(this.#tag);

    return true;
  }

  update(updater: (value: Value) => Value): void {
    this.set(updater(this.read()));
  }

  freeze(): void {
    throw new Error(`Not Implemented`);
  }
}

const variant = new URLSearchParams(window.location.search).get('variant');

function trackedArray(initialData: Array<number>) {
  console.log(`Creating ${variant}`);
  switch (variant) {
    case 'array-of-cells': {
      return initialData.map((d) => new Cell<number>(d));
    }
    case 'array-one-signal': {
      const signal = new Cell(0);
      const copy = [...initialData];
      return new Proxy(copy, {
        get(target, key, rec) {
          // console.log('get', key);
          signal.read();
          return target[key];
        },
        set(target, key, value, rec) {
          signal.set(0);
          console.log('set', key, value, copy);
          return Reflect.set(...arguments);
        },
      });
    }
    default:
      return new TrackedArray(initialData);
  }
}

class Test extends Component {
  // items = new TrackedArray(test.getData());

  // implementation pending -- coming soon!
  items = trackedArray(test.getData());

  start = () => {
    console.log(`Starting ${variant}`);
    switch (variant) {
      case 'array-of-cells':
        test.run((i) => {
          this.items[i].set(i);
        });
        break;
      default:
        test.run((i) => {
          this.items[i] = i;
        });
    }
  };

  // No spaces, like all the other frameworks (especially JSX)
  // Adding invisible characters is so annoying in JSX haha
  //
  // Ember should probably have a way to strip the unmeaning spaces anyway
  // I think the algo is easy
  // prettier-ignore
  <template>{{#each this.items as |item|}}{{test.formatItem item.current}}{{/each}}{{(this.start)}}</template>
}

export default Route(Test);
