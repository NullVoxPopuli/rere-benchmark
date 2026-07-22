import { afterNextRender, ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { helpers } from 'common';

const test = helpers.oneItem10kUpdates();

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<output>{{ formatted() }}</output>`,
})
export class App {
  protected readonly count = signal(test.getData());
  protected readonly formatted = computed(() => test.formatItem(this.count()));

  constructor() {
    afterNextRender(() => {
      test.doit((i: number) => this.count.set(i));
    });
  }
}
