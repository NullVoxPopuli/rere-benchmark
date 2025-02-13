import Route from 'ember-route-template';
import Component from '@glimmer/component';
import { helpers } from 'common';

const test = helpers.tenKitems1UpdateEach();

// @ts-expect-error - technically private API
import { consumeTag, createUpdatableTag, dirtyTag } from '@glimmer/validator';

// Coming soon?
// https://github.com/emberjs/rfcs/pull/1071

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

function trackedArray(initialData: number[]) {
  return initialData.map((d) => new Cell<number>(d));
}

class Test extends Component {
  // implementation pending -- coming soon!
  items = trackedArray(test.getData());

  start = () => {
    test.doit((i) => this.items[i].set(i));
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
