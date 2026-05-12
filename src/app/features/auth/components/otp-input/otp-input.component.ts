import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewChild,
  effect,
  input,
  output,
} from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { NumericOnlyDirective } from '../../../../shared/directives/numeric-only.directive';

/**
 * Input dedicado para código OTP de 6 dígitos.
 *
 * - Un solo input (mejor a11y que 6 inputs separados — R9).
 * - `inputmode="numeric"` para teclado numérico en móvil.
 * - `autocomplete="one-time-code"` permite a iOS/Android sugerir el código del SMS/app.
 * - Filtro paste mediante `appNumericOnly` (FR-009).
 * - Output `completed` cuando llega a 6 dígitos para auto-submit opcional.
 *
 * Implementa ControlValueAccessor para integrar con Reactive Forms en pages.
 */
@Component({
  selector: 'app-otp-input',
  standalone: true,
  imports: [FormsModule, NumericOnlyDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: OtpInputComponent,
      multi: true,
    },
  ],
  template: `
    <div class="otp-input-wrapper">
      <label [for]="id()" class="visually-hidden">Código de verificación de 6 dígitos</label>
      <input
        #ref
        [id]="id()"
        type="text"
        inputmode="numeric"
        autocomplete="one-time-code"
        maxlength="6"
        appNumericOnly
        [disabled]="disabled()"
        [(ngModel)]="value"
        (ngModelChange)="onValueChange($event)"
        (blur)="onTouched()"
        aria-label="Código de verificación"
        aria-required="true"
        class="otp-input"
      />
    </div>
  `,
  styles: [
    `
      .otp-input-wrapper { display: flex; justify-content: center; }
      .otp-input {
        font-size: 1.5rem;
        letter-spacing: 0.5rem;
        text-align: center;
        padding: 0.75rem 1rem;
        width: 12rem;
        border: 1px solid #999;
        border-radius: var(--sisrh-radius-md);
        font-family: 'Roboto Mono', monospace;
      }
      .otp-input:focus {
        outline: 2px solid var(--mat-sys-primary, #0d47a1);
        outline-offset: 2px;
      }
      .visually-hidden {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      }
    `,
  ],
})
export class OtpInputComponent implements ControlValueAccessor {
  readonly id = input<string>('otp-input');
  readonly disabled = input<boolean>(false);
  readonly completed = output<string>();

  @ViewChild('ref', { static: false }) inputRef?: ElementRef<HTMLInputElement>;

  value = '';
  private onChange: (val: string) => void = () => undefined;
  onTouched: () => void = () => undefined;

  constructor() {
    effect(() => {
      // re-emit completed cuando el value cambia y llega a 6 (independiente del trigger)
      if (this.value.length === 6) {
        this.completed.emit(this.value);
      }
    });
  }

  onValueChange(val: string): void {
    this.value = val;
    this.onChange(val);
    if (val.length === 6) {
      this.completed.emit(val);
    }
  }

  // ControlValueAccessor
  writeValue(val: string): void {
    this.value = val ?? '';
  }
  registerOnChange(fn: (val: string) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  setDisabledState(_isDisabled: boolean): void {
    /* el binding [disabled] en el template usa el input(); este hook se omite */
  }

  focus(): void {
    this.inputRef?.nativeElement.focus();
  }

  reset(): void {
    this.value = '';
    this.onChange('');
  }
}
