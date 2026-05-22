import { describe, expect, it, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { LoginFormComponent } from './login-form.component';

describe('LoginFormComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [LoginFormComponent],
      providers: [provideAnimationsAsync('noop')],
    });
  });

  it('renders decorative prefix icons for username and password', () => {
    const fixture = TestBed.createComponent(LoginFormComponent);
    fixture.componentRef.setInput('captchaSiteKey', 'test-key');
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const personIcon = root.querySelector('mat-icon[fonticon="person"]');
    const lockIcon = root.querySelector('mat-icon[fonticon="lock"]');

    expect(personIcon).toBeTruthy();
    expect(lockIcon).toBeTruthy();
    expect(personIcon?.getAttribute('aria-hidden')).toBe('true');
    expect(lockIcon?.getAttribute('aria-hidden')).toBe('true');
  });

  it('canSubmit is false when form is empty', () => {
    const fixture = TestBed.createComponent(LoginFormComponent);
    fixture.componentRef.setInput('captchaSiteKey', 'test-key');
    fixture.detectChanges();
    expect(fixture.componentInstance.canSubmit()).toBe(false);
  });

  it('canSubmit is true when both fields filled and no captcha required', () => {
    const fixture = TestBed.createComponent(LoginFormComponent);
    fixture.componentRef.setInput('captchaSiteKey', 'test-key');
    fixture.detectChanges();

    fixture.componentInstance.form.setValue({ username: 'jdoe', password: 'pass' });
    expect(fixture.componentInstance.canSubmit()).toBe(true);
  });

  it('canSubmit is false when captcha required but no token verified', () => {
    const fixture = TestBed.createComponent(LoginFormComponent);
    fixture.componentRef.setInput('captchaSiteKey', 'test-key');
    fixture.componentRef.setInput('showCaptcha', true);
    fixture.detectChanges();

    fixture.componentInstance.form.setValue({ username: 'jdoe', password: 'pass' });
    expect(fixture.componentInstance.canSubmit()).toBe(false);
  });

  it('canSubmit becomes true after captcha verified', () => {
    const fixture = TestBed.createComponent(LoginFormComponent);
    fixture.componentRef.setInput('captchaSiteKey', 'test-key');
    fixture.componentRef.setInput('showCaptcha', true);
    fixture.detectChanges();

    fixture.componentInstance.form.setValue({ username: 'jdoe', password: 'pass' });
    fixture.componentInstance.onCaptchaVerified('captcha-token-xyz');
    expect(fixture.componentInstance.canSubmit()).toBe(true);
  });

  it('canSubmit is false if captcha load failed (FR-004 fail-closed)', () => {
    const fixture = TestBed.createComponent(LoginFormComponent);
    fixture.componentRef.setInput('captchaSiteKey', 'test-key');
    fixture.componentRef.setInput('showCaptcha', true);
    fixture.detectChanges();

    fixture.componentInstance.form.setValue({ username: 'jdoe', password: 'pass' });
    fixture.componentInstance.onCaptchaError();
    expect(fixture.componentInstance.canSubmit()).toBe(false);
  });

  it('togglePasswordVisibility toggles the signal', () => {
    const fixture = TestBed.createComponent(LoginFormComponent);
    fixture.componentRef.setInput('captchaSiteKey', 'test-key');
    fixture.detectChanges();

    expect(fixture.componentInstance.passwordVisible()).toBe(false);
    fixture.componentInstance.togglePasswordVisibility();
    expect(fixture.componentInstance.passwordVisible()).toBe(true);
  });

  it('emits LoginRequest with username and password on submit', () => {
    const fixture = TestBed.createComponent(LoginFormComponent);
    fixture.componentRef.setInput('captchaSiteKey', 'test-key');
    fixture.detectChanges();

    fixture.componentInstance.form.setValue({ username: 'jdoe', password: 'pass' });

    const emitted: { username: string; password: string; turnstileToken?: string }[] = [];
    fixture.componentInstance.submitForm.subscribe((req) => emitted.push(req));

    fixture.componentInstance.submit();
    expect(emitted[0]).toEqual({ username: 'jdoe', password: 'pass' });
  });

  it('includes turnstileToken when captcha was verified', () => {
    const fixture = TestBed.createComponent(LoginFormComponent);
    fixture.componentRef.setInput('captchaSiteKey', 'test-key');
    fixture.componentRef.setInput('showCaptcha', true);
    fixture.detectChanges();

    fixture.componentInstance.form.setValue({ username: 'jdoe', password: 'pass' });
    fixture.componentInstance.onCaptchaVerified('TURNSTILE_TOKEN');

    const emitted: { turnstileToken?: string }[] = [];
    fixture.componentInstance.submitForm.subscribe((req) => emitted.push(req));

    fixture.componentInstance.submit();
    expect(emitted[0]?.turnstileToken).toBe('TURNSTILE_TOKEN');
  });
});
