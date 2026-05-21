import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PasswordStrengthComponent } from '../../../../shared/components/password-strength/password-strength.component';
import { AuthApiService } from '../../services/auth-api.service';
import { AuthService } from '../../../../core/services/auth.service';
import { LoginFlowService } from '../../services/login-flow.service';
import { ErrorMessageService } from '../../../../core/services/error-message.service';
import { isErrorResponse } from '../../../../core/models/error-response.model';
import {
  PasswordComplexityResult,
  passwordComplexityValidator,
  passwordsMatchValidator,
} from '../../models/password-policy.model';

/**
 * Pantalla de cambio de clave forzado (US3).
 *
 * Flujo:
 *  1. Usuario llega aquí porque login() devolvió newPass='S' (token cambio-clave 15 min).
 *  2. Llena nueva clave + confirmación; validador en tiempo real (FR-019, FR-020, FR-021).
 *  3. AMBOS inputs tienen toggle visibilidad independiente (FR-018, F10).
 *  4. Submit → POST /api/auth/cambiar-clave.
 *  5. Tras 200 OK → re-login automático con nueva clave para obtener flags limpias del flujo OTP siguiente.
 *  6. La nueva clave queda solo en memoria del componente durante la operación; se limpia inmediatamente.
 */
@Component({
  selector: 'app-change-password-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    PasswordStrengthComponent,
    RouterLink,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-card class="auth-card" appearance="outlined">
      <header class="auth-head">
        <h1 class="auth-head__title">Cambiar contraseña</h1>
        @if (username()) {
          <p class="auth-head__sub" aria-live="polite">
            Cuenta: <strong>{{ username() }}</strong>
          </p>
        } @else {
          <p class="auth-head__sub">Actualice su clave temporal para continuar</p>
        }
      </header>

      <mat-card-content class="auth-body">
        <p class="instructions">
          Por seguridad, debe cambiar su contraseña temporal antes de continuar.
        </p>

        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Nueva contraseña</mat-label>
            <input
              matInput
              [type]="newPasswordVisible() ? 'text' : 'password'"
              formControlName="nuevaClave"
              autocomplete="new-password"
              aria-required="true"
            />
            <button
              mat-icon-button
              matSuffix
              type="button"
              class="pwd-toggle-btn"
              (click)="toggleNewPasswordVisibility()"
              [attr.aria-label]="newPasswordVisible() ? 'Ocultar contraseña' : 'Mostrar contraseña'"
              [attr.aria-pressed]="newPasswordVisible()"
            >
              <mat-icon [fontIcon]="newPasswordVisible() ? 'visibility_off' : 'visibility'" />
            </button>
          </mat-form-field>

          @if (complexityResult()) {
            <app-password-strength [result]="complexityResult()!" />
          }

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Confirmar nueva contraseña</mat-label>
            <input
              matInput
              [type]="confirmPasswordVisible() ? 'text' : 'password'"
              formControlName="confirmarClave"
              autocomplete="new-password"
              aria-required="true"
              [attr.aria-invalid]="passwordsMismatch()"
            />
            <button
              mat-icon-button
              matSuffix
              type="button"
              class="pwd-toggle-btn"
              (click)="toggleConfirmPasswordVisibility()"
              [attr.aria-label]="confirmPasswordVisible() ? 'Ocultar confirmación' : 'Mostrar confirmación'"
              [attr.aria-pressed]="confirmPasswordVisible()"
            >
              <mat-icon [fontIcon]="confirmPasswordVisible() ? 'visibility_off' : 'visibility'" />
            </button>
            @if (passwordsMismatch()) {
              <mat-error aria-live="polite">Las contraseñas no coinciden</mat-error>
            }
          </mat-form-field>

          @if (errorMessage()) {
            <p role="alert" class="error-msg">{{ errorMessage() }}</p>
          }

          <button
            mat-raised-button
            color="primary"
            type="submit"
            class="submit-btn full-width"
            [disabled]="!canSubmit()"
          >
            Cambiar contraseña
          </button>

          @if (inProgress()) {
            <div class="spinner-wrap" role="status" aria-live="polite">
              <mat-progress-spinner mode="indeterminate" diameter="28" />
              <span>Cambiando contraseña…</span>
            </div>
          }
        </form>

        <div class="actions">
          <a mat-button routerLink="/auth/logout" class="abort-link">
            Cancelar y cerrar sesión
          </a>
        </div>
      </mat-card-content>
    </mat-card>
  `,
  styles: [
    `
      :host {
        display: block;
        font-family: var(--sisrh-font-sans, 'Source Sans 3', 'Segoe UI', system-ui, sans-serif);
      }
      .auth-card {
        width: 100%;
        max-width: 420px;
        margin: 0 auto;
        padding: 0;
        border-radius: 12px;
        overflow: hidden;
        background: #fff;
        border-color: var(--sisrh-color-border, #e2e8f0) !important;
        box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
      }
      .auth-head {
        padding: 1.25rem 1.5rem 1rem;
        border-bottom: 1px solid var(--sisrh-color-border, #e2e8f0);
        border-top: 3px solid var(--mat-sys-primary, #0d47a1);
        background: #fafbfc;
      }
      .auth-head__title {
        margin: 0;
        font-size: 1.125rem;
        font-weight: 600;
        color: var(--sisrh-color-primary, #0f172a);
        letter-spacing: -0.01em;
      }
      .auth-head__sub {
        margin: 0.35rem 0 0;
        font-size: 0.875rem;
        color: var(--sisrh-color-muted, #64748b);
        line-height: 1.45;
      }
      .auth-body.mat-mdc-card-content {
        padding: 1.375rem 1.5rem 1.5rem !important;
      }
      .instructions {
        margin: 0 0 1rem;
        font-size: 0.9375rem;
        line-height: 1.5;
        color: var(--sisrh-color-secondary, #334155);
      }
      .full-width { width: 100%; }
      .pwd-toggle-btn {
        width: 44px;
        height: 44px;
        padding: 0;
        flex-shrink: 0;
      }
      .pwd-toggle-btn .mat-icon,
      .pwd-toggle-btn mat-icon {
        width: 24px !important;
        height: 24px !important;
        font-size: 24px !important;
        line-height: 24px !important;
        color: var(--sisrh-color-secondary, #475569);
      }
      .pwd-toggle-btn:hover .mat-icon,
      .pwd-toggle-btn:focus-visible .mat-icon {
        color: var(--mat-sys-primary, #0d47a1);
      }
      .submit-btn { margin-top: 1rem; padding: 0.75rem; font-size: 1rem; font-family: var(--sisrh-font-sans); font-weight: 600; letter-spacing: 0.02em; }
      .error-msg { color: var(--sisrh-color-error); margin-top: 1rem; font-weight: 500; text-align: center; }
      .spinner-wrap {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.625rem;
        margin-top: 1rem;
        color: var(--sisrh-color-muted, #64748b);
        font-size: 0.875rem;
      }
      .actions { display: flex; justify-content: center; margin-top: 1.25rem; }
      .abort-link { color: var(--sisrh-color-cta, #0369a1); }
    `,
  ],
})
export class ChangePasswordPageComponent {
  private readonly api = inject(AuthApiService);
  private readonly auth = inject(AuthService);
  private readonly flow = inject(LoginFlowService);
  private readonly errorMessages = inject(ErrorMessageService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  readonly username = this.auth.username;
  readonly newPasswordVisible = signal(false);
  readonly confirmPasswordVisible = signal(false);
  readonly inProgress = signal(false);
  readonly errorMessage = signal<string>('');

  readonly form: FormGroup = this.fb.group(
    {
      nuevaClave: ['', [Validators.required, passwordComplexityValidator()]],
      confirmarClave: ['', [Validators.required]],
    },
    { validators: passwordsMatchValidator() },
  );

  /**
   * Resultado de complejidad para el componente de strength.
   * Reactivo a cambios del control vía signal manual + AbstractControl.statusChanges.
   * Se actualiza llamando `updateComplexity()` en el (input) del template.
   */
  readonly complexityResult = signal<PasswordComplexityResult | null>(null);

  /**
   * Methods (no computed) porque dependen de FormGroup que NO es signal.
   * Patrón ya validado en LoginFormComponent (US1).
   */
  passwordsMismatch(): boolean {
    return (
      this.form.errors?.['passwordsMismatch'] === true &&
      (this.form.get('confirmarClave')?.touched ?? false)
    );
  }

  canSubmit(): boolean {
    if (this.inProgress()) return false;
    return this.form.valid;
  }

  constructor() {
    // Suscripción a valueChanges para actualizar la signal de complexityResult
    this.form.controls['nuevaClave'].valueChanges.subscribe(() => {
      const errors = this.form.controls['nuevaClave'].errors;
      const result = errors?.['passwordComplexity'] as PasswordComplexityResult | undefined;
      if (result) {
        this.complexityResult.set(result);
      } else if (this.form.controls['nuevaClave'].value) {
        // Sin errores y con valor → todas las reglas pasan
        this.complexityResult.set({
          minLength: true,
          hasUppercase: true,
          hasLowercase: true,
          hasDigit: true,
          hasSpecialChar: true,
        });
      } else {
        this.complexityResult.set(null);
      }
    });
  }

  toggleNewPasswordVisibility(): void {
    this.newPasswordVisible.update((v) => !v);
  }

  toggleConfirmPasswordVisibility(): void {
    this.confirmPasswordVisible.update((v) => !v);
  }

  submit(): void {
    this.form.markAllAsTouched();
    if (!this.canSubmit()) return;

    const username = this.username();
    if (!username) {
      // Token cambio-clave inválido o expirado
      this.auth.clearSession();
      void this.router.navigate(['/auth/login']);
      return;
    }

    const nuevaClave = (this.form.value.nuevaClave as string) ?? '';
    this.errorMessage.set('');
    this.inProgress.set(true);

    this.api.changePassword({ nuevaClave }).subscribe({
      next: () => {
        // T079 + T081: re-login automático con la nueva clave para obtener flags claras
        // (requiereOtp/requiereEnroll/newPass), evitando ambigüedad del response del cambio.
        this.api.login({ username, password: nuevaClave }).subscribe({
          next: (loginResponse) => {
            this.inProgress.set(false);
            // Limpiar la clave de memoria tan pronto como sea posible
            this.form.reset();
            this.flow.classifyAndRoute(loginResponse);
          },
          error: (err: HttpErrorResponse) => {
            this.inProgress.set(false);
            this.form.reset();
            // Si el re-login falla, limpiar y volver a login
            this.auth.clearSession();
            void this.router.navigate(['/auth/login']);
            this.errorMessage.set(this.errorMessages.translate(err.error?.mensaje ?? null));
          },
        });
      },
      error: (err: HttpErrorResponse) => this.handleChangeError(err),
    });
  }

  private handleChangeError(err: HttpErrorResponse): void {
    this.inProgress.set(false);
    const body = err.error;
    if (isErrorResponse(body)) {
      // Caso raro: otro tab ya cambió la clave
      if (body.mensaje === 'Usuario ya cambió su contraseña') {
        this.auth.clearSession();
        void this.router.navigate(['/auth/login']);
        return;
      }
      this.errorMessage.set(this.errorMessages.translate(body.mensaje));
      return;
    }
    if (err.status === 401) {
      this.auth.clearSession();
      void this.router.navigate(['/auth/login']);
      return;
    }
    this.errorMessage.set(this.errorMessages.translate(null));
  }
}
