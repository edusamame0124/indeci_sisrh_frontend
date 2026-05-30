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
    expect(fixture.nativeElement.querySelector('.bar-fill--weak')).toBeTruthy();
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
    expect(fixture.nativeElement.querySelector('.bar-fill--medium')).toBeTruthy();
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
    expect(fixture.nativeElement.querySelector('.bar-fill--strong')).toBeTruthy();
  });

  it('renders met rules with check icon and unmet with cancel', () => {
    const fixture = setup({
      minLength: true,
      hasUppercase: false,
      hasLowercase: true,
      hasDigit: false,
      hasSpecialChar: true,
    });
    const items = fixture.nativeElement.querySelectorAll('.requirement');
    expect(items.length).toBe(5);
    expect((items[0] as HTMLElement).classList.contains('requirement--met')).toBe(true);
    expect((items[1] as HTMLElement).classList.contains('requirement--met')).toBe(false);
    expect((items[0] as HTMLElement).querySelector('[fontIcon="check_circle"]')).toBeTruthy();
    expect((items[1] as HTMLElement).querySelector('[fontIcon="cancel"]')).toBeTruthy();
  });

  it('bar width reflects number of rules met', () => {
    const fixture = setup({
      minLength: true,
      hasUppercase: true,
      hasLowercase: true,
      hasDigit: true,
      hasSpecialChar: true,
    });
    const fill = fixture.nativeElement.querySelector('.bar-fill') as HTMLElement;
    expect(fill.style.width).toBe('100%');
  });
});
