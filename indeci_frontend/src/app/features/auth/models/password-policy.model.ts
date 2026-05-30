import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Política de complejidad de clave (FR-019).
 * Cada regla evaluada de forma independiente para mostrar feedback en tiempo real.
 */
export interface PasswordComplexityResult {
  readonly minLength: boolean;
  readonly hasUppercase: boolean;
  readonly hasLowercase: boolean;
  readonly hasDigit: boolean;
  readonly hasSpecialChar: boolean;
}

export type PasswordStrength = 'weak' | 'medium' | 'strong';

/** Evalúa cada regla de complejidad sobre el texto actual (UI en tiempo real). */
export function evaluatePasswordComplexity(password: string): PasswordComplexityResult {
  const v = password ?? '';
  return {
    minLength: v.length >= 8,
    hasUppercase: /[A-Z]/.test(v),
    hasLowercase: /[a-z]/.test(v),
    hasDigit: /[0-9]/.test(v),
    hasSpecialChar: /[^A-Za-z0-9]/.test(v),
  };
}

export function evaluatePasswordStrength(r: PasswordComplexityResult): PasswordStrength {
  const score = Object.values(r).filter(Boolean).length;
  if (score <= 2) return 'weak';
  if (score <= 4) return 'medium';
  return 'strong';
}

/** Validador de Reactive Forms: retorna `{ passwordComplexity: PasswordComplexityResult }` cuando NO cumple. */
export function passwordComplexityValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const result = evaluatePasswordComplexity((control.value as string) ?? '');
    const allPass = Object.values(result).every(Boolean);
    return allPass ? null : { passwordComplexity: result };
  };
}

/** Validador a nivel de FormGroup: clave nueva y confirmación deben coincidir. */
export function passwordsMatchValidator(
  newField = 'nuevaClave',
  confirmField = 'confirmarClave',
): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const a = group.get(newField)?.value;
    const b = group.get(confirmField)?.value;
    if (a == null || b == null || a === '') return null;
    return a === b ? null : { passwordsMismatch: true };
  };
}
