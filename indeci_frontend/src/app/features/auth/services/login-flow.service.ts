import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ClientTelemetryService } from '../../../core/services/client-telemetry.service';
import { ErrorMessageService } from '../../../core/services/error-message.service';
import { ErrorResponse } from '../../../core/models/error-response.model';
import { LoginResponse } from '../models/login.model';
import { LoginFlowState } from '../models/login-flow-state.model';

/**
 * Orquesta los 4 flujos de autenticación: enruta tras cada respuesta del backend
 * según las flags `requiereOtp`, `requiereEnroll`, `newPass`, y según los errores 400/403.
 */
@Injectable({ providedIn: 'root' })
export class LoginFlowService {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly errorMessages = inject(ErrorMessageService);
  private readonly telemetry = inject(ClientTelemetryService);

  /** Máximo intentos OTP por sesión temporal antes de invalidar (FR-033). */
  static readonly MAX_OTP_ATTEMPTS = 5;

  private readonly _state = signal<LoginFlowState>({ kind: 'idle' });
  readonly state = this._state.asReadonly();

  /**
   * URL a la que regresar tras completar todo el flujo de login (FR-026, T088).
   * LoginPageComponent la setea desde el queryParam `returnUrl` al inicializarse.
   * OtpPageComponent / OtpEnrollPageComponent / ChangePasswordPageComponent la leen
   * para el navigateByUrl final tras éxito completo.
   */
  private readonly _returnUrl = signal<string>('/');
  readonly returnUrl = this._returnUrl.asReadonly();

  setReturnUrl(url: string | null): void {
    this._returnUrl.set(url && url !== '' ? url : '/');
  }

  setState(s: LoginFlowState): void {
    this._state.set(s);
  }

  /** Despacha la respuesta del POST /api/auth/login al estado y ruta correcta. */
  classifyAndRoute(response: LoginResponse): void {
    // Caso 1: Cambio de clave forzado
    if (response.newPass === 'S') {
      this.auth.setTemporalToken(response.token);
      this._state.set({ kind: 'awaiting-password-change' });
      void this.router.navigate(['/auth/cambiar-clave']);
      return;
    }

    // Caso 2: Primer login — enroll OTP
    if (response.requiereEnroll === true) {
      this.auth.setTemporalToken(response.token);
      this._state.set({ kind: 'awaiting-otp-enroll', qr: '' }); // qr se setea al llamar enroll
      void this.router.navigate(['/auth/otp/enroll']);
      return;
    }

    // Caso 3: OTP normal
    if (response.requiereOtp === true) {
      this.auth.setTemporalToken(response.token);
      this._state.set({
        kind: 'awaiting-otp',
        attemptsRemaining: LoginFlowService.MAX_OTP_ATTEMPTS,
      });
      void this.router.navigate(['/auth/otp']);
      return;
    }

    // Caso 4: Sesión completa (raro: solo si backend salta OTP, ej. usuario sin OTP_HABILITADO en una config admin)
    if (response.token) {
      this.auth.setSession(response);
      this._state.set({ kind: 'success' });
      void this.router.navigateByUrl(this._returnUrl());
      return;
    }

    // Fallback: respuesta inesperada
    this.telemetry.track('BACKEND_UNREACHABLE', { mensaje: 'LoginResponse sin flags reconocibles' });
    this._state.set({
      kind: 'error',
      mensaje: 'Ocurrió un problema. Inténtalo de nuevo más tarde.',
    });
  }

  /** Maneja errores del backend al hacer login. */
  handleError(err: ErrorResponse): void {
    if (err.requiereCaptcha) {
      this._state.set({
        kind: 'awaiting-captcha',
        previousMessage: this.errorMessages.translate(err.mensaje),
      });
      return;
    }

    if (err.mensaje === 'Demasiados intentos, intenta luego' || err.status === 429) {
      this._state.set({ kind: 'rate-limited', secondsRemaining: 60 });
      return;
    }

    if (err.status === 403 && err.mensaje === 'Usuario inactivo') {
      void this.router.navigate(['/auth/cuenta-inactiva']);
      return;
    }

    this._state.set({
      kind: 'error',
      mensaje: this.errorMessages.translate(err.mensaje),
    });
  }

  /** Decrementa contador OTP. Si llega a 0, invalida y redirige a login (FR-033). */
  consumeOtpAttempt(): boolean {
    const current = this._state();
    if (current.kind !== 'awaiting-otp') return false;
    const remaining = current.attemptsRemaining - 1;
    if (remaining <= 0) {
      this.auth.clearSession();
      this.telemetry.track('OTP_LIMIT_EXCEEDED');
      this._state.set({ kind: 'idle' });
      void this.router.navigate(['/auth/login'], {
        queryParams: { error: 'otp-limit-exceeded' },
      });
      return false;
    }
    this._state.set({ kind: 'awaiting-otp', attemptsRemaining: remaining });
    return true;
  }

  reset(): void {
    this._state.set({ kind: 'idle' });
    // NOTA: NO reseteamos _returnUrl aquí. La preservamos durante todo el flujo
    // hasta que el usuario complete login O hasta que se llame explícitamente clearReturnUrl().
  }

  clearReturnUrl(): void {
    this._returnUrl.set('/');
  }
}
