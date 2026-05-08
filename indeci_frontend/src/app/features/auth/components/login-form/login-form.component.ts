import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { LoginRequest } from '../../models/login.model';
import { TurnstileWidgetComponent } from '../../../../shared/components/turnstile-widget/turnstile-widget.component';

/**
 * Formulario de credenciales (FR-001 a FR-005).
 *
 * - Username + password con validación reactiva en tiempo real.
 * - Botón submit deshabilitado hasta que ambos campos sean válidos (FR-002).
 * - Toggle visibilidad password con `aria-label` y navegable por teclado (FR-003, F9).
 * - Integra `<app-turnstile-widget>` cuando el padre lo activa (FR-004, Q4).
 * - Soporta initialUsername para preservar el campo entre intentos (FR-007, F3).
 */
@Component({
  selector: 'app-login-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    TurnstileWidgetComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Usuario</mat-label>
        <input
          matInput
          formControlName="username"
          autocomplete="username"
          aria-required="true"
          [attr.aria-invalid]="usernameInvalid()"
        />
        @if (usernameInvalid()) {
          <mat-error aria-live="polite">Ingresa tu usuario</mat-error>
        }
      </mat-form-field>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Contraseña</mat-label>
        <input
          matInput
          [type]="passwordVisible() ? 'text' : 'password'"
          formControlName="password"
          autocomplete="current-password"
          aria-required="true"
          [attr.aria-invalid]="passwordInvalid()"
        />
        <button
          mat-icon-button
          matSuffix
          type="button"
          class="pwd-toggle-btn"
          (click)="togglePasswordVisibility()"
          [attr.aria-label]="passwordVisible() ? 'Ocultar contraseña' : 'Mostrar contraseña'"
          [attr.aria-pressed]="passwordVisible()"
        >
          <mat-icon [fontIcon]="passwordVisible() ? 'visibility_off' : 'visibility'" />
        </button>
        @if (passwordInvalid()) {
          <mat-error aria-live="polite">Ingresa tu contraseña</mat-error>
        }
      </mat-form-field>

      @if (showCaptcha()) {
        <div class="captcha-wrapper">
          <app-turnstile-widget
            [siteKey]="captchaSiteKey()"
            (verified)="onCaptchaVerified($event)"
            (errorEvent)="onCaptchaError()"
          />
          @if (captchaLoadFailed()) {
            <p class="captcha-error" role="alert">
              El verificador de seguridad no pudo cargarse. Desactiva tus bloqueadores de
              anuncios o intenta desde otro navegador.
            </p>
          }
        </div>
      }

      <button
        mat-flat-button
        color="primary"
        type="submit"
        class="submit-btn full-width"
        [disabled]="!canSubmit()"
      >
        Iniciar sesión
      </button>
    </form>
  `,
  styles: [
    `
      :host {
        display: block;
        font-family: var(--sisrh-font-sans, 'Source Sans 3', 'Segoe UI', system-ui, sans-serif);
      }
      .full-width {
        width: 100%;
      }
      .submit-btn {
        margin-top: 0.25rem;
        min-height: 44px;
        font-size: 0.9375rem;
        font-weight: 600;
        letter-spacing: 0.02em;
        border-radius: 8px !important;
        font-family: var(--sisrh-font-sans);
      }
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
        color: #475569;
      }
      .pwd-toggle-btn:hover .mat-icon,
      .pwd-toggle-btn:focus-visible .mat-icon {
        color: var(--mat-sys-primary, #0d47a1);
      }
      /* Contraste explícito: primario cuando está habilitado; disabled legible (no texto blanco sobre gris claro). */
      .submit-btn.mat-mdc-unelevated-button:not(.mat-mdc-button-disabled) {
        color: #fff;
      }
      .submit-btn.mat-mdc-button-disabled {
        color: rgba(15, 23, 42, 0.45) !important;
        background-color: #e2e8f0 !important;
      }
      .captcha-wrapper {
        display: flex;
        flex-direction: column;
        align-items: center;
        margin: 1rem 0;
      }
      .captcha-error {
        color: var(--sisrh-color-error);
        margin-top: 0.5rem;
        text-align: center;
      }
      :host ::ng-deep .full-width.mat-mdc-form-field .mat-mdc-text-field-wrapper {
        font-family: inherit;
      }
      :host ::ng-deep .full-width.mat-mdc-form-field input {
        font-size: 0.9375rem;
      }
    `,
  ],
})
export class LoginFormComponent {
  // Inputs (signal-based)
  readonly initialUsername = input<string>('');
  readonly showCaptcha = input<boolean>(false);
  readonly captchaSiteKey = input.required<string>();
  readonly disabled = input<boolean>(false);

  // Outputs
  readonly submitForm = output<LoginRequest>();

  // Internal signals
  readonly passwordVisible = signal(false);
  readonly captchaLoadFailed = signal(false);
  private readonly captchaToken = signal<string | null>(null);

  private readonly fb = new FormBuilder();
  readonly form = this.fb.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required]],
  });

  /**
   * Methods (no computed) porque dependen de FormGroup.invalid/touched que NO son signals.
   * Templates las invocan en cada change detection cycle, OK con OnPush.
   */
  usernameInvalid(): boolean {
    const ctrl = this.form.controls.username;
    return ctrl.touched && ctrl.invalid;
  }
  passwordInvalid(): boolean {
    const ctrl = this.form.controls.password;
    return ctrl.touched && ctrl.invalid;
  }
  canSubmit(): boolean {
    if (this.disabled()) return false;
    if (this.form.invalid) return false;
    if (this.showCaptcha()) {
      if (this.captchaLoadFailed()) return false;
      if (this.captchaToken() === null) return false;
    }
    return true;
  }

  constructor() {
    // Pre-rellenar username si viene de un intento previo (FR-007, F3)
    queueMicrotask(() => {
      const u = this.initialUsername();
      if (u) this.form.patchValue({ username: u });
    });
  }

  togglePasswordVisibility(): void {
    this.passwordVisible.update((v) => !v);
  }

  onCaptchaVerified(token: string): void {
    this.captchaToken.set(token);
    this.captchaLoadFailed.set(false);
  }

  onCaptchaError(): void {
    this.captchaLoadFailed.set(true);
    this.captchaToken.set(null);
  }

  submit(): void {
    this.form.markAllAsTouched();
    if (!this.canSubmit()) return;
    const { username, password } = this.form.getRawValue();
    const req: LoginRequest = {
      username: username ?? '',
      password: password ?? '',
    };
    const t = this.captchaToken();
    if (t) req.turnstileToken = t;
    this.submitForm.emit(req);
  }

  /** Permite al padre resetear el captcha tras un fallo. */
  resetCaptcha(): void {
    this.captchaToken.set(null);
  }
}
