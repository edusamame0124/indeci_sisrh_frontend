import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
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
    MatProgressSpinnerModule,
    RouterLink,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-card class="otp-card">
      <mat-card-header>
        <mat-card-title>Verificación en dos pasos</mat-card-title>
      </mat-card-header>
      <mat-card-content>
        @if (username()) {
          <p class="username-header" aria-live="polite">
            Iniciando sesión como <strong>{{ username() }}</strong>
          </p>
        }

        <p class="instructions">
          Ingresa el código de 6 dígitos que muestra tu aplicación autenticadora.
        </p>

        <app-otp-input
          id="otp-input-otp-page"
          [disabled]="isSubmitting()"
          (completed)="onCodeCompleted($event)"
        />

        @if (errorMessage()) {
          <p role="alert" class="error-msg">{{ errorMessage() }}</p>
        }

        @if (showHourHint()) {
          <p role="status" class="hint-msg">
            Si el código sigue fallando, verifica que la hora de tu dispositivo esté
            sincronizada (los códigos rotan cada 30 segundos).
          </p>
        }

        @if (isSubmitting()) {
          <div class="spinner-wrapper">
            <mat-progress-spinner mode="indeterminate" diameter="32" />
          </div>
        }

        <div class="actions">
          <a mat-button routerLink="/auth/logout" class="abort-link">
            Volver al inicio de sesión
          </a>
        </div>
      </mat-card-content>
    </mat-card>
  `,
  styles: [
    `
      .otp-card { width: 100%; max-width: 480px; padding: 1.5rem; }
      .username-header { text-align: center; color: #555; margin-bottom: 1rem; }
      .instructions { margin-bottom: 1rem; }
      .error-msg { color: var(--sisrh-color-error); margin-top: 1rem; font-weight: 500; }
      .hint-msg { color: var(--sisrh-color-warning); margin-top: 0.5rem; font-style: italic; }
      .spinner-wrapper { display: flex; justify-content: center; margin-top: 1rem; }
      .actions { display: flex; justify-content: center; margin-top: 1.5rem; }
      .abort-link { color: var(--mat-sys-primary); }
    `,
  ],
})
export class OtpPageComponent {
  private readonly api = inject(AuthApiService);
  private readonly auth = inject(AuthService);
  private readonly flow = inject(LoginFlowService);
  private readonly errorMessages = inject(ErrorMessageService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly username = this.auth.username;

  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string>('');
  readonly failedAttempts = signal(0);

  readonly showHourHint = computed(() => this.failedAttempts() >= 3);

  onCodeCompleted(codigo: string): void {
    if (this.isSubmitting()) return;
    this.errorMessage.set('');
    this.isSubmitting.set(true);

    this.api.confirmOtp({ codigo }).subscribe({
      next: (response) => {
        this.isSubmitting.set(false);
        if (response.token && response.refreshToken) {
          // Sesión completa — usa returnUrl preservado por el flow desde /auth/login (T088, FR-026)
          this.auth.setSession(response);
          const returnUrl = this.flow.returnUrl();
          this.flow.clearReturnUrl();
          void this.router.navigateByUrl(returnUrl);
        } else {
          // Respuesta inesperada
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

      // Sesión temporal expiró (10 min) o backend perdió el secret enroll
      if (body.mensaje === 'OTP no generado') {
        this.auth.clearSession();
        void this.router.navigate(['/auth/login']);
        return;
      }

      // Solo cuenta como fallo si fue código incorrecto
      if (body.mensaje === 'Código OTP inválido') {
        const attempts = this.failedAttempts() + 1;
        this.failedAttempts.set(attempts);
        // FR-033: 5 intentos máximos → al 6to fallo (sexto intento total) invalida
        const stillAllowed = this.flow.consumeOtpAttempt();
        if (!stillAllowed) {
          // consumeOtpAttempt ya navegó y limpió la sesión
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
