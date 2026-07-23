import { afterNextRender, ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { helpers } from 'common';

const test = helpers.fanOut();

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <output>
      @for (c of consumers; track c) {
        <span>{{ formatted() }}</span>
      }
    </output>
  `,
})
export class App {
  protected readonly consumers = test.consumerRange;
  protected readonly value = signal(test.getData());
  protected readonly formatted = computed(() => test.formatItem(this.value()));

  constructor() {
    afterNextRender(() => {
      test.doit((v: number) => this.value.set(v));
    });
  }
}
