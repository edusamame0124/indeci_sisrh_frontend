import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
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
  imports: [MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="password-strength" aria-live="polite">
      <div class="bar-track" aria-hidden="true">
        <div
          class="bar-fill bar-fill--{{ strength() }}"
          [style.width.%]="strengthPercent()"
        ></div>
      </div>
      <p class="strength-label">
        Fortaleza:
        <strong class="strength-label__value strength-label__value--{{ strength() }}">
          {{ strengthLabel() }}
        </strong>
      </p>
      <ul class="requirements" aria-label="Requisitos de la clave">
        @for (rule of rules(); track rule.key) {
          <li class="requirement" [class.requirement--met]="rule.met">
            <mat-icon
              class="requirement__icon"
              [fontIcon]="rule.met ? 'check_circle' : 'cancel'"
              [attr.aria-hidden]="true"
            />
            <span>{{ rule.label }}</span>
          </li>
        }
      </ul>
    </div>
  `,
  styles: [
    `
      .password-strength {
        font-size: 0.875rem;
        margin: 0.25rem 0 0.5rem;
      }

      .bar-track {
        height: 6px;
        border-radius: 3px;
        background: #e8eaed;
        overflow: hidden;
      }

      .bar-fill {
        height: 100%;
        border-radius: 3px;
        transition:
          width 220ms ease,
          background-color 220ms ease;
      }

      .bar-fill--weak {
        background: var(--sisrh-color-error, #c62828);
      }

      .bar-fill--medium {
        background: var(--sisrh-color-warning, #ed6c02);
      }

      .bar-fill--strong {
        background: var(--sisrh-color-success, #2e7d32);
      }

      .strength-label {
        margin: 0.35rem 0 0.5rem;
        color: var(--sisrh-color-secondary, #475569);
      }

      .strength-label__value--weak {
        color: var(--sisrh-color-error, #c62828);
      }

      .strength-label__value--medium {
        color: var(--sisrh-color-warning, #ed6c02);
      }

      .strength-label__value--strong {
        color: var(--sisrh-color-success, #2e7d32);
      }

      .requirements {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 0.2rem;
      }

      .requirement {
        display: flex;
        align-items: center;
        gap: 0.35rem;
        color: var(--sisrh-color-error, #c62828);
        transition: color 180ms ease;
      }

      .requirement--met {
        color: var(--sisrh-color-success, #2e7d32);
      }

      .requirement__icon {
        width: 1.125rem;
        height: 1.125rem;
        font-size: 1.125rem;
        flex-shrink: 0;
      }

      .requirement:not(.requirement--met) .requirement__icon {
        color: var(--sisrh-color-error, #c62828);
      }

      .requirement--met .requirement__icon {
        color: var(--sisrh-color-success, #2e7d32);
      }
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

  readonly strengthPercent = computed(() => {
    const met = Object.values(this.result()).filter(Boolean).length;
    return Math.max(8, (met / 5) * 100);
  });

  readonly rules = computed(() => {
    const r = this.result();
    return [
      { key: 'minLength', met: r.minLength, label: 'Al menos 8 caracteres' },
      { key: 'hasUppercase', met: r.hasUppercase, label: 'Al menos una mayúscula' },
      { key: 'hasLowercase', met: r.hasLowercase, label: 'Al menos una minúscula' },
      { key: 'hasDigit', met: r.hasDigit, label: 'Al menos un dígito' },
      { key: 'hasSpecialChar', met: r.hasSpecialChar, label: 'Al menos un carácter especial' },
    ] as const;
  });
}
