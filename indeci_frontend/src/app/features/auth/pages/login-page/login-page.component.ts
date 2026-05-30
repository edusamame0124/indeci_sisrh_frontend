import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { LoginFormComponent } from '../../components/login-form/login-form.component';
import { CountdownComponent } from '../../../../shared/components/countdown/countdown.component';
import { AuthApiService } from '../../services/auth-api.service';
import { LoginFlowService } from '../../services/login-flow.service';
import { ErrorMessageService } from '../../../../core/services/error-message.service';
import { isErrorResponse } from '../../../../core/models/error-response.model';
import { environment } from '../../../../../environments/environment';
import { LoginRequest } from '../../models/login.model';

/**
 * Pantalla de inicio de sesión (US1).
 *
 * Orquesta el `<app-login-form>` con el `LoginFlowService` que enruta tras la respuesta:
 * - 200 + flags → enruta a /auth/otp, /auth/otp/enroll o /auth/cambiar-clave (T063)
 * - 200 + tokens completos → setSession + navegar (raro, T064 maneja el caso normal en otp-page)
 * - 400/403 → maneja captcha/rate-limit/error (T065)
 *
 * Maneja FR-007 (F3): preserva último username intentado en signal local y rellena
 * el formulario al regresar via returnUrl o tras error.
 */
@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [
    LoginFormComponent,
    CountdownComponent,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-card class="login-card" appearance="outlined">
      <header class="login-head">
        <div class="login-head__brand">
          <mat-icon class="login-head__icon" aria-hidden="true">lock_outline</mat-icon>
          <div>
            <h1 class="login-head__title">Inicie sesión</h1>
            <p class="login-head__sub">Ingrese sus credenciales institucionales</p>
          </div>
        </div>
      </header>

      <mat-card-content class="login-body">
        @switch (state().kind) {
          @case ('rate-limited') {
            <p role="alert" class="msg msg--info">
              Demasiados intentos. Espere
              <app-countdown
                [seconds]="rateLimitSeconds()"
                (complete)="onRateLimitExpired()"
              />
              antes de volver a intentar.
            </p>
          }
          @case ('error') {
            <p role="alert" class="msg msg--error">
              <mat-icon aria-hidden="true">error_outline</mat-icon>
              <span>{{ errorMessage() }}</span>
            </p>
          }
          @case ('awaiting-captcha') {
            <p role="status" class="msg msg--info">{{ captchaPreviousMessage() }}</p>
          }
        }

        <app-login-form
          [initialUsername]="lastUsername()"
          [showCaptcha]="showCaptcha()"
          [captchaSiteKey]="turnstileSiteKey"
          [disabled]="isSubmitting()"
          (submitForm)="onSubmit($event)"
        />

        @if (isSubmitting()) {
          <div class="spinner-wrap" role="status" aria-live="polite">
            <mat-progress-spinner mode="indeterminate" diameter="28" />
            <span>Iniciando sesión…</span>
          </div>
        }
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
      .login-card {
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
      .login-head {
        padding: var(--sisrh-spacing-lg, 1.25rem) var(--sisrh-spacing-xl, 1.5rem)
          var(--sisrh-spacing-md, 0.875rem);
        border-bottom: 1px solid var(--sisrh-color-border, #e2e8f0);
        border-top: 3px solid var(--mat-sys-primary, #0d47a1);
        background: #fafbfc;
      }
      .login-head__brand {
        display: flex;
        align-items: flex-start;
        gap: 0.75rem;
      }
      .login-head__icon {
        flex-shrink: 0;
        color: var(--mat-sys-primary, #0d47a1);
        font-size: 1.5rem;
        width: 1.5rem;
        height: 1.5rem;
        margin-top: 0.125rem;
      }
      .login-head__title {
        margin: 0;
        font-size: 1.125rem;
        font-weight: 600;
        color: var(--sisrh-color-primary, #0f172a);
        letter-spacing: -0.01em;
      }
      .login-head__sub {
        margin: 0.35rem 0 0;
        font-size: 0.875rem;
        color: var(--sisrh-color-muted, #64748b);
        line-height: 1.45;
      }
      .login-body.mat-mdc-card-content {
        display: flex;
        flex-direction: column;
        gap: var(--sisrh-spacing-lg, 1.25rem);
        padding: var(--sisrh-spacing-lg, 1.25rem) var(--sisrh-spacing-xl, 1.5rem)
          var(--sisrh-spacing-xl, 1.5rem) !important;
      }
      .msg {
        display: flex;
        align-items: flex-start;
        gap: 0.5rem;
        margin: 0;
        padding: var(--sisrh-spacing-md, 0.875rem) var(--sisrh-spacing-md, 0.875rem);
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
      .msg--info {
        color: #92400e;
        background: #fffbeb;
        border: 1px solid #fde68a;
      }
      .msg--error {
        color: var(--sisrh-color-error);
        background: #fef2f2;
        border: 1px solid #fecaca;
        font-weight: 500;
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
    `,
  ],
})
export class LoginPageComponent implements OnInit {
  private readonly api = inject(AuthApiService);
  private readonly flow = inject(LoginFlowService);
  private readonly errorMessages = inject(ErrorMessageService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly turnstileSiteKey = environment.turnstileSiteKey;

  readonly lastUsername = signal<string>('');

  readonly state = this.flow.state;
  readonly isSubmitting = computed(() => this.state().kind === 'submitting');
  readonly showCaptcha = computed(() => this.state().kind === 'awaiting-captcha');

  readonly rateLimitSeconds = computed(() => {
    const s = this.state();
    return s.kind === 'rate-limited' ? s.secondsRemaining : 0;
  });

  readonly errorMessage = computed(() => {
    const s = this.state();
    return s.kind === 'error' ? s.mensaje : '';
  });

  readonly captchaPreviousMessage = computed(() => {
    const s = this.state();
    return s.kind === 'awaiting-captcha' ? s.previousMessage : '';
  });

  ngOnInit(): void {
    this.flow.reset();
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    this.flow.setReturnUrl(returnUrl);

    const errFlag = this.route.snapshot.queryParamMap.get('error');
    if (errFlag === 'otp-limit-exceeded') {
      this.flow.setState({
        kind: 'error',
        mensaje: 'Superó los intentos permitidos. Inicie sesión nuevamente.',
      });
    }
  }

  onSubmit(req: LoginRequest): void {
    this.lastUsername.set(req.username);

    this.flow.setState({ kind: 'submitting' });
    this.api.login(req).subscribe({
      next: (response) => this.flow.classifyAndRoute(response),
      error: (err: HttpErrorResponse) => this.handleError(err),
    });
  }

  private handleError(err: HttpErrorResponse): void {
    const body = err.error;
    if (isErrorResponse(body)) {
      this.flow.handleError(body);
      return;
    }
    if (err.status === 0) {
      this.flow.setState({
        kind: 'error',
        mensaje: 'Sin conexión. Verifique su red e intente nuevamente.',
      });
      return;
    }
    this.flow.setState({
      kind: 'error',
      mensaje: this.errorMessages.translate(null),
    });
  }

  onRateLimitExpired(): void {
    this.flow.reset();
  }

  protected navigateAfterSuccess(): void {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/';
    void this.router.navigateByUrl(returnUrl);
  }
}
