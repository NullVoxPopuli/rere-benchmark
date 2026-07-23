import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  signal,
  type WritableSignal,
} from '@angular/core';
import { helpers } from 'common';

const test = helpers.tenKitems1UpdateEach();

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @for (item of items; track $index) {
      {{ format(item()) }}
    }
  `,
})
export class App {
  // one signal per row: updating one item doesn't touch the list itself
  protected readonly items: WritableSignal<number | undefined>[] = test
    .getData()
    .map((item: number | undefined) => signal(item));

  protected readonly format = (item: number | undefined) => test.formatItem(item as number);

  constructor() {
    afterNextRender(() => {
      test.doit((i: number) => this.items[i]?.set(i));
    });
  }
}
