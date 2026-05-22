import { describe, expect, it } from 'vitest';
import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TestBed } from '@angular/core/testing';
import { NumericOnlyDirective } from './numeric-only.directive';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, NumericOnlyDirective],
  template: `<input id="x" [formControl]="control" appNumericOnly maxlength="6" />`,
})
class HostComponent {
  readonly control = new FormControl('');
}

/**
 * Helper: dispatcha un evento paste con clipboardData mockeado (jsdom no soporta DataTransfer).
 */
function dispatchPaste(input: HTMLInputElement, text: string): void {
  const event = new Event('paste', { bubbles: true, cancelable: true }) as ClipboardEvent;
  Object.defineProperty(event, 'clipboardData', {
    value: { getData: (_type: string) => text },
    writable: false,
  });
  Object.defineProperty(event, 'target', { value: input, writable: false });
  input.dispatchEvent(event);
}

describe('NumericOnlyDirective', () => {
  it('filters non-numeric characters from paste event', () => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();

    const input: HTMLInputElement = fixture.nativeElement.querySelector('#x');
    dispatchPaste(input, 'a1b2-c3d4');
    fixture.detectChanges();

    expect(fixture.componentInstance.control.value).toBe('1234');
  });

  it('truncates pasted content to maxlength', () => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();

    const input: HTMLInputElement = fixture.nativeElement.querySelector('#x');
    dispatchPaste(input, '12345678901');
    fixture.detectChanges();

    expect(fixture.componentInstance.control.value).toBe('123456');
  });

  it('keeps only digits when paste contains only letters', () => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();

    const input: HTMLInputElement = fixture.nativeElement.querySelector('#x');
    dispatchPaste(input, 'abcdef');
    fixture.detectChanges();

    expect(fixture.componentInstance.control.value).toBe('');
  });
});
