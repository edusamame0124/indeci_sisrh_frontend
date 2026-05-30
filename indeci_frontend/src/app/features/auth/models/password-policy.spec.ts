import { describe, expect, it } from 'vitest';
import { FormControl, FormGroup } from '@angular/forms';
import {
  evaluatePasswordComplexity,
  evaluatePasswordStrength,
  passwordComplexityValidator,
  passwordsMatchValidator,
  PasswordComplexityResult,
} from './password-policy.model';

describe('evaluatePasswordComplexity', () => {
  it('marks each rule independently for partial passwords', () => {
    const r = evaluatePasswordComplexity('Sape545787*-');
    expect(r.minLength).toBe(true);
    expect(r.hasUppercase).toBe(true);
    expect(r.hasLowercase).toBe(true);
    expect(r.hasDigit).toBe(true);
    expect(r.hasSpecialChar).toBe(true);
    expect(evaluatePasswordStrength(r)).toBe('strong');
  });
});

describe('passwordComplexityValidator', () => {
  const validate = (v: string) => passwordComplexityValidator()(new FormControl(v));

  it('returns null for fully compliant password', () => {
    expect(validate('Abcd1234!')).toBeNull();
  });

  it('returns errors object when too short', () => {
    const errors = validate('Ab1!');
    expect(errors?.['passwordComplexity']).toBeDefined();
    expect(errors?.['passwordComplexity']['minLength']).toBe(false);
  });

  it('returns errors object when no uppercase', () => {
    const errors = validate('abcd1234!');
    expect(errors?.['passwordComplexity']['hasUppercase']).toBe(false);
  });

  it('returns errors object when no special char', () => {
    const errors = validate('Abcdefg1');
    expect(errors?.['passwordComplexity']['hasSpecialChar']).toBe(false);
  });

  it('handles null/empty input as failing all rules', () => {
    const errors = validate('');
    const r = errors?.['passwordComplexity'] as PasswordComplexityResult;
    expect(r.minLength).toBe(false);
    expect(r.hasUppercase).toBe(false);
  });
});

describe('evaluatePasswordStrength', () => {
  it('weak when ≤ 2 rules met', () => {
    expect(
      evaluatePasswordStrength({
        minLength: false,
        hasUppercase: true,
        hasLowercase: true,
        hasDigit: false,
        hasSpecialChar: false,
      }),
    ).toBe('weak');
  });

  it('medium when 3-4 rules met', () => {
    expect(
      evaluatePasswordStrength({
        minLength: true,
        hasUppercase: true,
        hasLowercase: true,
        hasDigit: true,
        hasSpecialChar: false,
      }),
    ).toBe('medium');
  });

  it('strong when all 5 rules met', () => {
    expect(
      evaluatePasswordStrength({
        minLength: true,
        hasUppercase: true,
        hasLowercase: true,
        hasDigit: true,
        hasSpecialChar: true,
      }),
    ).toBe('strong');
  });
});

describe('passwordsMatchValidator', () => {
  const validator = passwordsMatchValidator();
  const makeGroup = (a: string, b: string) =>
    new FormGroup({ nuevaClave: new FormControl(a), confirmarClave: new FormControl(b) });

  it('returns null when passwords match', () => {
    expect(validator(makeGroup('Abc1!', 'Abc1!'))).toBeNull();
  });

  it('returns passwordsMismatch when they differ', () => {
    expect(validator(makeGroup('Abc1!', 'Xyz9?'))).toEqual({ passwordsMismatch: true });
  });

  it('returns null when first is empty (no comparison yet)', () => {
    expect(validator(makeGroup('', 'something'))).toBeNull();
  });
});
