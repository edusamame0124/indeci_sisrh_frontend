import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { OtpInputComponent } from '../../components/otp-input/otp-input.component';
import { AuthApiService } from '../../services/auth-api.service';
import { AuthService } from '../../../../core/services/auth.service';
import { LoginFlowService } from '../../services/login-flow.service';
import { ErrorMessageService } from '../../../../core/services/error-message.service';
import { isErrorResponse } from '../../../../core/models/error-response.model';

/**
 * Pantalla de validación OTP (US1).
 *
 * - Muestra el username derivado del token temporal (FR-010, F4).
 * - Renderiza link "Volver al inicio de sesión" que invoca AuthService.clearSession() (FR-013, F5).
 * - Mantiene contador local 5 → 0 (FR-033). Al 4to fallo muestra sugerencia "verificar hora" (FR-012).
 * - Al 6to fallo invalida token temporal y redirige a login.
 */
@Component({
  selector: 'app-otp-page',
  standalone: true,
  imports: [
    OtpInputComponent,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    RouterLink,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-card class="auth-card" appearance="outlined">
      <header class="auth-head">
        <div class="auth-head__brand">
          <mat-icon class="auth-head__icon" aria-hidden="true">verified_user</mat-icon>
          <div>
            <h1 class="auth-head__title">Verificación en dos pasos</h1>
            @if (username()) {
              <p class="auth-head__sub" aria-live="polite">
                Hola, <strong>{{ username() }}</strong>
              </p>
            } @else {
              <p class="auth-head__sub">Ingrese el código de su aplicación autenticadora</p>
            }
          </div>
        </div>
      </header>

      <mat-card-content class="auth-body">
        <p class="instructions">
          Ingrese el código de 6 dígitos que muestra su aplicación autenticadora.
        </p>

        <p class="attempts" role="status" aria-live="polite">
          @if (otpAttemptsRemaining() === 1) {
            Le queda <strong>1 intento</strong> antes de cerrar esta sesión.
          } @else {
            Le quedan <strong>{{ otpAttemptsRemaining() }} intentos</strong> antes de cerrar esta sesión.
          }
        </p>

        <app-otp-input
          id="otp-input-otp-page"
          [disabled]="isSubmitting()"
          (completed)="onCodeCompleted($event)"
        />

        @if (errorMessage()) {
          <p role="alert" class="msg msg--error">
            <mat-icon aria-hidden="true">error_outline</mat-icon>
            <span>{{ errorMessage() }}</span>
          </p>
        }

        @if (showHourHint()) {
          <p role="status" class="msg msg--hint">
            Si el código sigue fallando, verifique que la hora de su dispositivo esté sincronizada
            (los códigos rotan cada 30 segundos).
          </p>
        }

        @if (isSubmitting()) {
          <div class="spinner-wrap" role="status" aria-live="polite">
            <mat-progress-spinner mode="indeterminate" diameter="28" />
            <span>Verificando código…</span>
          </div>
        }

        <div class="actions">
          <a mat-stroked-button routerLink="/auth/logout" class="abort-link">
            <mat-icon>arrow_back</mat-icon>
            Volver al inicio de sesión
          </a>
        </div>
      </mat-card-content>
    </mat-card>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
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
      .auth-head__brand {
        display: flex;
        align-items: flex-start;
        gap: 0.75rem;
      }
      .auth-head__icon {
        flex-shrink: 0;
        color: var(--mat-sys-primary, #0d47a1);
        font-size: 1.5rem;
        width: 1.5rem;
        height: 1.5rem;
        margin-top: 0.125rem;
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
        margin: 0 0 0.75rem;
        font-size: 0.9375rem;
        line-height: 1.5;
        color: var(--sisrh-color-secondary, #334155);
      }
      .attempts {
        margin: 0 0 1rem;
        font-size: 0.8125rem;
        color: var(--sisrh-color-muted, #64748b);
        line-height: 1.45;
      }
      .msg {
        display: flex;
        align-items: flex-start;
        gap: 0.5rem;
        margin: 1rem 0 0;
        padding: 0.75rem 0.875rem;
        border-radius: 8px;
        font-size: 0.875rem;
        line-height: 1.45;
      }
      .msg mat-icon {
        flex-shrink: 0;
        font-size: 1.125rem;
        width: 1.125rem;
        height: 1.125rem;
        margin-top: 0.125rem;
      }
      .msg--error {
        color: var(--sisrh-color-error);
        background: #fef2f2;
        border: 1px solid #fecaca;
        font-weight: 500;
      }
      .msg--hint {
        color: #92400e;
        background: #fffbeb;
        border: 1px solid #fde68a;
      }
      .spinner-wrap {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.625rem;
        margin-top: 1rem;
        color: var(--sisrh-color-muted, #64748b);
        font-size: 0.875rem;
      }
      .actions {
        display: flex;
        justify-content: center;
        margin-top: 1.25rem;
      }
      .abort-link {
        color: var(--sisrh-color-cta, #0369a1);
      }
    `,
  ],
})
export class OtpPageComponent {
  private readonly api = inject(AuthApiService);
  private readonly auth = inject(AuthService);
  private readonly flow = inject(LoginFlowService);
  private readonly errorMessages = inject(ErrorMessageService);
  private readonly router = inject(Router);

  readonly username = this.auth.username;

  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string>('');
  readonly failedAttempts = signal(0);

  readonly showHourHint = computed(() => this.failedAttempts() >= 3);

  readonly otpAttemptsRemaining = computed(() => {
    const s = this.flow.state();
    if (s.kind === 'awaiting-otp') {
      return s.attemptsRemaining;
    }
    return LoginFlowService.MAX_OTP_ATTEMPTS;
  });

  onCodeCompleted(codigo: string): void {
    if (this.isSubmitting()) return;
    this.errorMessage.set('');
    this.isSubmitting.set(true);

    this.api.confirmOtp({ codigo }).subscribe({
      next: (response) => {
        this.isSubmitting.set(false);
        if (response.token) {
          // Fase 3 SSO: completeSession decide si ir a selector o a returnUrl
          // según el claim "sistemas" del JWT recién emitido.
          this.flow.completeSession(response);
        } else {
          this.errorMessage.set(this.errorMessages.translate(null));
        }
      },
      error: (err: HttpErrorResponse) => this.handleError(err),
    });
  }

  private handleError(err: HttpErrorResponse): void {
    this.isSubmitting.set(false);
    const body = err.error;
    if (isErrorResponse(body)) {
      this.errorMessage.set(this.errorMessages.translate(body.mensaje));

      if (body.mensaje === 'OTP no generado') {
        this.auth.clearSession();
        void this.router.navigate(['/auth/login']);
        return;
      }

      if (body.mensaje === 'Código OTP inválido') {
        const attempts = this.failedAttempts() + 1;
        this.failedAttempts.set(attempts);
        const stillAllowed = this.flow.consumeOtpAttempt();
        if (!stillAllowed) {
          return;
        }
      }
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
