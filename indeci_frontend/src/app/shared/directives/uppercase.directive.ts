import { Directive, HostListener } from '@angular/core';
import { NgControl } from '@angular/forms';

/**
 * Directive `appUppercase` — convierte el texto a MAYÚSCULAS mientras se escribe
 * (también cubre el pegado, que dispara un evento `input`). Funciona con Reactive
 * Forms vía NgControl. Preserva la posición del cursor: pasar a mayúsculas no
 * altera la longitud del texto, así que la selección se mantiene.
 */
@Directive({
  selector: '[appUppercase]',
  standalone: true,
})
export class UppercaseDirective {
  constructor(private readonly ngControl: NgControl) {}

  @HostListener('input', ['$event'])
  onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const upper = input.value.toUpperCase();
    if (upper === input.value) {
      return;
    }
    const start = input.selectionStart;
    const end = input.selectionEnd;
    input.value = upper;
    this.ngControl.control?.setValue(upper, { emitEvent: true });
    input.setSelectionRange(start, end);
  }
}
