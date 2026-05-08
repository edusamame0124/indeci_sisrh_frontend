import { describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { OtpInputComponent } from './otp-input.component';

describe('OtpInputComponent', () => {
  it('emits `completed` when value reaches 6 digits', () => {
    TestBed.configureTestingModule({ imports: [OtpInputComponent] });
    const fixture = TestBed.createComponent(OtpInputComponent);
    fixture.componentRef.setInput('id', 'test-otp');
    fixture.detectChanges();

    const emitted: string[] = [];
    fixture.componentInstance.completed.subscribe((v) => emitted.push(v));

    fixture.componentInstance.onValueChange('123456');
    expect(emitted[0]).toBe('123456');
  });

  it('does NOT emit `completed` when value is shorter', () => {
    TestBed.configureTestingModule({ imports: [OtpInputComponent] });
    const fixture = TestBed.createComponent(OtpInputComponent);
    fixture.componentRef.setInput('id', 'test-otp');
    fixture.detectChanges();

    const emitted: string[] = [];
    fixture.componentInstance.completed.subscribe((v) => emitted.push(v));

    fixture.componentInstance.onValueChange('12345');
    expect(emitted.length).toBe(0);
  });

  it('reset() clears the value', () => {
    TestBed.configureTestingModule({ imports: [OtpInputComponent] });
    const fixture = TestBed.createComponent(OtpInputComponent);
    fixture.componentRef.setInput('id', 'test-otp');
    fixture.detectChanges();

    fixture.componentInstance.onValueChange('123456');
    fixture.componentInstance.reset();
    expect(fixture.componentInstance.value).toBe('');
  });

  it('writeValue (ControlValueAccessor) sets the value', () => {
    TestBed.configureTestingModule({ imports: [OtpInputComponent] });
    const fixture = TestBed.createComponent(OtpInputComponent);
    fixture.componentRef.setInput('id', 'test-otp');
    fixture.detectChanges();

    fixture.componentInstance.writeValue('999');
    expect(fixture.componentInstance.value).toBe('999');
  });
});
