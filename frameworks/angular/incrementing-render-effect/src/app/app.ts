import {
  afterEveryRender,
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  signal,
  viewChild,
  type ElementRef,
} from '@angular/core';
import { helpers } from 'common';

const test = helpers.incrementingRenderEffect();

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<output #el>{{ output() }}</output>`,
})
export class App {
  protected readonly output = signal(-1);

  private readonly el = viewChild.required<ElementRef<HTMLOutputElement>>('el');
  private advancer: (() => void) | undefined;

  constructor() {
    afterEveryRender(() => {
      this.advancer?.();
    });

    afterNextRender(() => {
      test.doit({
        element: this.el().nativeElement,
        get: () => this.output(),
        set: (value: number) => this.output.set(value),
        setupAdvancer: (fn: () => void) => {
          this.advancer = fn;
        },
      });
    });
  }
}
