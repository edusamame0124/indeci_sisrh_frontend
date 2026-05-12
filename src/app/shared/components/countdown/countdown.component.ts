import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  input,
  output,
  signal,
} from '@angular/core';

/**
 * Cuenta regresiva visible en segundos. Emite `complete` cuando llega a 0.
 * Usado en la pantalla de login durante rate-limit (FR-005).
 */
@Component({
  selector: 'app-countdown',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span role="timer" aria-live="polite">
      {{ display() }}
    </span>
  `,
})
export class CountdownComponent implements OnInit, OnDestroy {
  readonly seconds = input.required<number>();
  readonly complete = output<void>();

  private readonly remaining = signal(0);
  readonly display = computed(() => {
    const s = this.remaining();
    return s > 0 ? `${s}s` : '0s';
  });

  private intervalId: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    this.remaining.set(this.seconds());
    this.intervalId = setInterval(() => {
      const next = this.remaining() - 1;
      this.remaining.set(next);
      if (next <= 0) {
        this.stop();
        this.complete.emit();
      }
    }, 1000);
  }

  ngOnDestroy(): void {
    this.stop();
  }

  private stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}
