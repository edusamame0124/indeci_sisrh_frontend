import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { OtpInputComponent } from '../../components/otp-input/otp-input.component';
import { QrDisplayComponent } from '../../components/qr-display/qr-display.component';
import { EnrollInstructionsComponent } from '../../components/enroll-instructions/enroll-instructions.component';
import { AuthApiService } from '../../services/auth-api.service';
import { AuthService } from '../../../../core/services/auth.service';
import { LoginFlowService } from '../../services/login-flow.service';
import { ErrorMessageService } from '../../../../core/services/error-message.service';
import { isErrorResponse } from '../../../../core/models/error-response.model';

/**
 * Pantalla de activación del segundo factor (US2).
 *
 * Flujo:
 *  1. ngOnInit llama a `AuthApiService.enrollOtp()` que devuelve `{qr: dataURL}`.
 *  2. Muestra `<app-qr-display>` + `<app-enroll-instructions>` + `<app-otp-input>` (reutilizado de US1).
 *  3. Submit llama `AuthApiService.confirmOtp({codigo})`.
 *  4. Tras 200 OK → MatSnackBar "Segundo factor activado correctamente" (FR-017) → navega a `/`.
 *  5. Edge case (T074): si enroll devuelve 400 "OTP ya está configurado" → redirige a /auth/login.
 */
@Component({
  selector: 'app-otp-enroll-page',
  standalone: true,
  imports: [
    OtpInputComponent,
    QrDisplayComponent,
    EnrollInstructionsComponent,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    RouterLink,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-card class="enroll-card" appearance="outlined">
      <header class="enroll-head">
        <div class="enroll-head__brand">
          <mat-icon class="enroll-head__icon" aria-hidden="true">qr_code_2</mat-icon>
          <div class="enroll-head__text">
            <h1 class="enroll-head__title">Activar segundo factor</h1>
            @if (username()) {
              <p class="enroll-head__sub" aria-live="polite">
                Hola, <strong>{{ username() }}</strong>
              </p>
            }
          </div>
        </div>
      </header>

      <mat-card-content class="enroll-body">
        @if (loadError()) {
          <div class="state-message state-message--error" role="alert">
            <mat-icon fontIcon="error_outline" aria-hidden="true" />
            <div>
              <p class="state-message__title">No pudimos generar tu código QR</p>
              <p class="state-message__detail">{{ loadError() }}</p>
              <a mat-button color="primary" routerLink="/auth/login">
                Volver al inicio de sesión
              </a>
            </div>
          </div>
        } @else {
          <div class="enroll-main">
            <div class="enroll-main__qr">
              <app-qr-display [qr]="qrDataUrl()" />
            </div>
            <div class="enroll-main__copy">
              <app-enroll-instructions />
            </div>
          </div>

          <section class="confirm-block" aria-labelledby="confirm-heading">
            <div class="confirm-block__lead" id="confirm-heading">
              <span class="confirm-block__badge" aria-hidden="true">6</span>
              <p class="confirm-block__txt">
                Ingresa el código de <strong>6 dígitos</strong> que muestra tu app para finalizar la
                activación.
              </p>
            </div>

            <app-otp-input
              id="otp-input-enroll"
              [disabled]="confirmInProgress() || loadingQr()"
              (completed)="onConfirmCode($event)"
            />

            @if (confirmError()) {
              <p role="alert" class="error-msg">
                <mat-icon fontIcon="error_outline" aria-hidden="true" />
                {{ confirmError() }}
              </p>
            }

            @if (confirmInProgress()) {
              <div class="loading-inline" role="status" aria-live="polite">
                <mat-progress-spinner mode="indeterminate" diameter="24" />
                <span>Verificando código…</span>
              </div>
            }
          </section>

          <footer class="enroll-footer">
            <a mat-button routerLink="/auth/logout" class="link-back">
              <mat-icon fontIcon="arrow_back" aria-hidden="true" />
              Volver al inicio de sesión
            </a>
          </footer>
        }
      </mat-card-content>
    </mat-card>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }
      .enroll-card {
        width: 100%;
        max-width: 920px;
        margin: 0 auto;
        padding: 0;
        border-radius: 12px;
        overflow: hidden;
        background: #fff;
        border-color: #e2e8f0 !important;
        box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
      }

      .enroll-head {
        padding: 1.25rem 1.5rem 1.125rem;
        border-bottom: 1px solid #e2e8f0;
        border-top: 3px solid var(--mat-sys-primary, #0d47a1);
        background: #fafbfc;
      }
      .enroll-head__brand {
        display: flex;
        align-items: flex-start;
        gap: 0.75rem;
      }
      .enroll-head__icon {
        flex-shrink: 0;
        color: var(--mat-sys-primary, #0d47a1);
        font-size: 1.5rem;
        width: 1.5rem;
        height: 1.5rem;
        margin-top: 0.125rem;
      }
      .enroll-head__title {
        margin: 0;
        font-size: 1.125rem;
        font-weight: 600;
        color: #0f172a;
        letter-spacing: -0.01em;
      }
      .enroll-head__sub {
        margin: 0.35rem 0 0;
        font-size: 0.875rem;
        color: #64748b;
      }
      .enroll-head__sub strong {
        color: #0f172a;
        font-weight: 600;
      }

      .enroll-body.mat-mdc-card-content {
        padding: 1.5rem 1.5rem 1.25rem !important;
      }

      .enroll-main {
        display: flex;
        flex-direction: column;
        align-items: stretch;
        gap: 2rem;
      }
      @media (min-width: 768px) {
        .enroll-main {
          display: grid;
          grid-template-columns: minmax(280px, 360px) minmax(0, 1fr);
          gap: 2rem 2.5rem;
          align-items: start;
        }
        .enroll-main__qr {
          position: sticky;
          top: 0.5rem;
        }
      }

      .enroll-main__qr {
        display: flex;
        justify-content: center;
      }
      @media (min-width: 768px) {
        .enroll-main__qr {
          justify-content: flex-start;
        }
      }

      .confirm-block {
        margin-top: 1.75rem;
        padding-top: 1.5rem;
        border-top: 1px solid #e2e8f0;
      }
      .confirm-block__lead {
        display: flex;
        align-items: flex-start;
        gap: 0.75rem;
        margin-bottom: 1rem;
      }
      .confirm-block__badge {
        flex-shrink: 0;
        width: 1.625rem;
        height: 1.625rem;
        border-radius: 50%;
        border: 1px solid #cbd5e1;
        color: #0f172a;
        background: #f8fafc;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-weight: 600;
        font-size: 0.75rem;
        margin-top: 0.125rem;
      }
      .confirm-block__txt {
        margin: 0;
        line-height: 1.5;
        color: #334155;
        font-size: 0.9375rem;
      }

      .error-msg {
        display: flex;
        align-items: center;
        justify-content: flex-start;
        gap: 0.5rem;
        color: var(--sisrh-color-error);
        margin: 0.875rem 0 0;
        font-weight: 500;
        font-size: 0.875rem;
      }
      .error-msg mat-icon {
        font-size: 1.125rem;
        width: 1.125rem;
        height: 1.125rem;
      }

      .loading-inline {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin: 0.75rem 0 0;
        color: #64748b;
        font-size: 0.875rem;
      }

      .state-message {
        display: flex;
        gap: 1rem;
        padding: 1.25rem;
        border-radius: 8px;
        align-items: flex-start;
      }
      .state-message--error {
        background: #fef2f2;
        border: 1px solid #fecaca;
      }
      .state-message mat-icon {
        flex-shrink: 0;
        color: var(--sisrh-color-error);
        font-size: 1.5rem;
        width: 1.5rem;
        height: 1.5rem;
      }
      .state-message__title {
        margin: 0 0 0.25rem;
        font-weight: 600;
        color: #1a1a1a;
      }
      .state-message__detail {
        margin: 0 0 0.75rem;
        color: #555;
      }

      .enroll-footer {
        display: flex;
        justify-content: center;
        margin-top: 1.25rem;
        padding-top: 0.25rem;
      }
      .link-back {
        color: var(--mat-sys-primary, #0d47a1);
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        font-size: 0.875rem;
      }
    `,
  ],
})
export class OtpEnrollPageComponent implements OnInit {
  private readonly api = inject(AuthApiService);
  private readonly auth = inject(AuthService);
  private readonly flow = inject(LoginFlowService);
  private readonly errorMessages = inject(ErrorMessageService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  readonly username = this.auth.username;

  readonly qrDataUrl = signal<string>('');
  readonly loadingQr = signal(true);
  readonly loadError = signal<string>('');

  readonly confirmInProgress = signal(false);
  readonly confirmError = signal<string>('');

  ngOnInit(): void {
    this.api.enrollOtp().subscribe({
      next: (response) => {
        this.qrDataUrl.set(response.qrImage);
        this.loadingQr.set(false);
      },
      error: (err: HttpErrorResponse) => this.handleEnrollError(err),
    });
  }

  onConfirmCode(codigo: string): void {
    if (this.confirmInProgress() || !this.qrDataUrl()) return;
    this.confirmError.set('');
    this.confirmInProgress.set(true);

    this.api.confirmOtp({ codigo }).subscribe({
      next: (response) => {
        this.confirmInProgress.set(false);
        if (response.token) {
          // Fase 3 SSO: sesión inmediata (no se pierde si el usuario cierra
          // la pestaña durante el snackbar); routing diferido tras el delay.
          this.flow.establishSession(response);
          // FR-017: confirmar visualmente activación antes de navegar
          this.snackBar.open('Segundo factor activado correctamente', 'Cerrar', {
            duration: 2000,
            panelClass: 'success-snackbar',
          });
          setTimeout(() => this.flow.routeAfterOtpSuccess(), 800);
        } else {
          this.confirmError.set(this.errorMessages.translate(null));
        }
      },
      error: (err: HttpErrorResponse) => this.handleConfirmError(err),
    });
  }

  private handleEnrollError(err: HttpErrorResponse): void {
    this.loadingQr.set(false);
    const body = err.error;
    if (isErrorResponse(body)) {
      // T074 / Edge case: si OTP ya está configurado, redirigir a login
      if (body.mensaje === 'OTP ya está configurado') {
        this.auth.clearSession();
        void this.router.navigate(['/auth/login']);
        this.snackBar.open(
          'Tu segundo factor ya está configurado. Inicia sesión normalmente.',
          'Cerrar',
          { duration: 4000 },
        );
        return;
      }
      this.loadError.set(this.errorMessages.translate(body.mensaje));
      return;
    }
    if (err.status === 401) {
      // Token temporal expiró
      this.auth.clearSession();
      void this.router.navigate(['/auth/login']);
      return;
    }
    this.loadError.set(this.errorMessages.translate(null));
  }

  private handleConfirmError(err: HttpErrorResponse): void {
    this.confirmInProgress.set(false);
    const body = err.error;
    if (isErrorResponse(body)) {
      this.confirmError.set(this.errorMessages.translate(body.mensaje));
      // Solo cuenta como fallo OTP si fue código incorrecto (FR-033 cap)
      if (body.mensaje === 'Código OTP inválido') {
        // Reutilizamos la misma lógica de cap del flow, pero como en enroll el flow inicia
        // en 'awaiting-otp-enroll', el cap se gestiona localmente con un contador propio
        // si fuera necesario. Para enroll, el límite real es la expiración del token (10 min)
        // y el secret en memoria del backend, por lo que un cap dual sería redundante.
      }
      // Si secret se perdió en backend (servidor reiniciado durante enroll)
      if (body.mensaje === 'OTP no generado') {
        this.auth.clearSession();
        void this.router.navigate(['/auth/login']);
      }
      return;
    }
    if (err.status === 401) {
      this.auth.clearSession();
      void this.router.navigate(['/auth/login']);
      return;
    }
    this.confirmError.set(this.errorMessages.translate(null));
  }
}
