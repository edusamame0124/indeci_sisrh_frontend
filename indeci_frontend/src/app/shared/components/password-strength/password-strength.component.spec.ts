import { describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { PasswordStrengthComponent } from './password-strength.component';
import { PasswordComplexityResult } from '../../../features/auth/models/password-policy.model';

describe('PasswordStrengthComponent', () => {
  function setup(result: PasswordComplexityResult) {
    TestBed.configureTestingModule({ imports: [PasswordStrengthComponent] });
    const fixture = TestBed.createComponent(PasswordStrengthComponent);
    fixture.componentRef.setInput('result', result);
    fixture.detectChanges();
    return fixture;
  }

  it('shows "Débil" when ≤ 2 rules met', () => {
    const fixture = setup({
      minLength: false,
      hasUppercase: true,
      hasLowercase: true,
      hasDigit: false,
      hasSpecialChar: false,
    });
    expect(fixture.componentInstance.strength()).toBe('weak');
    expect(fixture.componentInstance.strengthLabel()).toBe('Débil');
    expect(fixture.nativeElement.querySelector('.bar--weak')).toBeTruthy();
  });

  it('shows "Media" when 3-4 rules met', () => {
    const fixture = setup({
      minLength: true,
      hasUppercase: true,
      hasLowercase: true,
      hasDigit: true,
      hasSpecialChar: false,
    });
    expect(fixture.componentInstance.strength()).toBe('medium');
    expect(fixture.componentInstance.strengthLabel()).toBe('Media');
    expect(fixture.nativeElement.querySelector('.bar--medium')).toBeTruthy();
  });

  it('shows "Fuerte" when all 5 rules met', () => {
    const fixture = setup({
      minLength: true,
      hasUppercase: true,
      hasLowercase: true,
      hasDigit: true,
      hasSpecialChar: true,
    });
    expect(fixture.componentInstance.strength()).toBe('strong');
    expect(fixture.componentInstance.strengthLabel()).toBe('Fuerte');
    expect(fixture.nativeElement.querySelector('.bar--strong')).toBeTruthy();
  });

  it('renders all 5 requirements with correct met/unmet state', () => {
    const fixture = setup({
      minLength: true,
      hasUppercase: false,
      hasLowercase: true,
      hasDigit: false,
      hasSpecialChar: true,
    });
    const items = fixture.nativeElement.querySelectorAll('.requirements li');
    expect(items.length).toBe(5);
    expect((items[0] as HTMLElement).classList.contains('met')).toBe(true);  // minLength
    expect((items[1] as HTMLElement).classList.contains('met')).toBe(false); // hasUppercase
    expect((items[2] as HTMLElement).classList.contains('met')).toBe(true);  // hasLowercase
    expect((items[3] as HTMLElement).classList.contains('met')).toBe(false); // hasDigit
    expect((items[4] as HTMLElement).classList.contains('met')).toBe(true);  // hasSpecialChar
  });

  it('progressbar has proper aria attributes', () => {
    const fixture = setup({
      minLength: true,
      hasUppercase: true,
      hasLowercase: true,
      hasDigit: true,
      hasSpecialChar: true,
    });
    const bar = fixture.nativeElement.querySelector('[role="progressbar"]') as HTMLElement;
    expect(bar).toBeTruthy();
    expect(bar.getAttribute('aria-valuenow')).toBe('3');
    expect(bar.getAttribute('aria-valuemin')).toBe('0');
    expect(bar.getAttribute('aria-valuemax')).toBe('3');
    expect(bar.getAttribute('aria-label')).toContain('Fuerte');
  });
});
