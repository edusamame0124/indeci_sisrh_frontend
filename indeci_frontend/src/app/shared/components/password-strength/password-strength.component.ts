import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import {
  PasswordComplexityResult,
  PasswordStrength,
  evaluatePasswordStrength,
} from '../../../features/auth/models/password-policy.model';

/**
 * Indicador visual de fortaleza de clave + lista de requisitos en tiempo real (FR-020).
 */
@Component({
  selector: 'app-password-strength',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="password-strength">
      <div
        class="bar bar--{{ strength() }}"
        [attr.aria-label]="'Fortaleza de la clave: ' + strengthLabel()"
        role="progressbar"
        [attr.aria-valuenow]="strengthScore()"
        aria-valuemin="0"
        aria-valuemax="3"
      ></div>
      <p class="strength-label">Fortaleza: <strong>{{ strengthLabel() }}</strong></p>
      <ul class="requirements" aria-label="Requisitos de la clave">
        <li [class.met]="result().minLength">Al menos 8 caracteres</li>
        <li [class.met]="result().hasUppercase">Al menos una mayúscula</li>
        <li [class.met]="result().hasLowercase">Al menos una minúscula</li>
        <li [class.met]="result().hasDigit">Al menos un dígito</li>
        <li [class.met]="result().hasSpecialChar">Al menos un carácter especial</li>
      </ul>
    </div>
  `,
  styles: [
    `
      .password-strength { font-size: 0.875rem; }
      .bar { height: 6px; border-radius: 3px; background: #e0e0e0; transition: background 200ms ease; }
      .bar--weak { background: var(--sisrh-color-error); width: 33%; }
      .bar--medium { background: var(--sisrh-color-warning); width: 66%; }
      .bar--strong { background: var(--sisrh-color-success); width: 100%; }
      .strength-label { margin: 0.25rem 0; }
      .requirements { list-style: none; padding-left: 0; margin: 0; }
      .requirements li { color: var(--sisrh-color-error); padding: 0.125rem 0; }
      .requirements li.met { color: var(--sisrh-color-success); }
      .requirements li::before { content: '✗ '; }
      .requirements li.met::before { content: '✓ '; }
    `,
  ],
})
export class PasswordStrengthComponent {
  readonly result = input.required<PasswordComplexityResult>();

  readonly strength = computed<PasswordStrength>(() => evaluatePasswordStrength(this.result()));

  readonly strengthLabel = computed(() => {
    const map: Record<PasswordStrength, string> = {
      weak: 'Débil',
      medium: 'Media',
      strong: 'Fuerte',
    };
    return map[this.strength()];
  });

  readonly strengthScore = computed(() => {
    const map: Record<PasswordStrength, number> = { weak: 1, medium: 2, strong: 3 };
    return map[this.strength()];
  });
}
