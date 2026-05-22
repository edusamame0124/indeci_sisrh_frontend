import { Directive, HostListener } from '@angular/core';
import { NgControl } from '@angular/forms';

/**
 * Directive `appNumericOnly` — filtra caracteres no numéricos en input/paste (FR-009).
 * Aplicar en inputs OTP y similares. Funciona con Reactive Forms vía NgControl.
 */
@Directive({
  selector: '[appNumericOnly]',
  standalone: true,
})
export class NumericOnlyDirective {
  constructor(private readonly ngControl: NgControl) {}

  @HostListener('input', ['$event'])
  onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const filtered = input.value.replace(/[^0-9]/g, '');
    if (filtered !== input.value) {
      input.value = filtered;
      this.ngControl.control?.setValue(filtered, { emitEvent: true });
    }
  }

  @HostListener('paste', ['$event'])
  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const pasted = event.clipboardData?.getData('text') ?? '';
    const filtered = pasted.replace(/[^0-9]/g, '');
    const input = event.target as HTMLInputElement;
    const maxLength = input.maxLength > 0 ? input.maxLength : filtered.length;
    const truncated = filtered.substring(0, maxLength);
    input.value = truncated;
    this.ngControl.control?.setValue(truncated, { emitEvent: true });
  }
}
