import { describe, expect, it, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Router } from '@angular/router';
import { LoginFlowService } from './login-flow.service';
import { AuthService } from '../../../core/services/auth.service';
import { ClientTelemetryService } from '../../../core/services/client-telemetry.service';

function makeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS384' }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.sig`;
}

describe('LoginFlowService', () => {
  let service: LoginFlowService;
  let router: Router;
  let auth: AuthService;

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    TestBed.configureTestingModule({
      providers: [provideRouter([])],
    });
    service = TestBed.inject(LoginFlowService);
    router = TestBed.inject(Router);
    auth = TestBed.inject(AuthService);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    if (typeof localStorage !== 'undefined') localStorage.clear();
    auth.clearSession();
  });

  it('classifyAndRoute: newPass S → cambiar-clave', () => {
    const exp = Math.floor(Date.now() / 1000) + 600;
    const token = makeJwt({ sub: 'u', otpValidado: true, newPassOk: false, exp });
    service.classifyAndRoute({
      token,
      newPass: 'S',
      requiereOtp: false,
      requiereEnroll: false,
      roles: [],
      permisos: [],
    });
    expect(router.navigate).toHaveBeenCalledWith(['/auth/cambiar-clave']);
    expect(service.state().kind).toBe('awaiting-password-change');
  });

  it('classifyAndRoute: requiereEnroll → otp/enroll', () => {
    const exp = Math.floor(Date.now() / 1000) + 600;
    const token = makeJwt({ sub: 'u', otpValidado: false, newPassOk: true, exp });
    service.classifyAndRoute({
      token,
      newPass: 'N',
      requiereOtp: false,
      requiereEnroll: true,
      roles: [],
      permisos: [],
    });
    expect(router.navigate).toHaveBeenCalledWith(['/auth/otp/enroll']);
    expect(service.state().kind).toBe('awaiting-otp-enroll');
  });

  it('classifyAndRoute: requiereOtp → /auth/otp', () => {
    const exp = Math.floor(Date.now() / 1000) + 600;
    const token = makeJwt({ sub: 'u', otpValidado: false, newPassOk: true, exp });
    service.classifyAndRoute({
      token,
      newPass: 'N',
      requiereOtp: true,
      requiereEnroll: false,
      roles: [],
      permisos: [],
    });
    expect(router.navigate).toHaveBeenCalledWith(['/auth/otp']);
    expect(service.state().kind).toBe('awaiting-otp');
  });

  it('classifyAndRoute: sesión completa con refreshToken → returnUrl', () => {
    service.setReturnUrl('/dashboard');
    const exp = Math.floor(Date.now() / 1000) + 600;
    const token = makeJwt({
      sub: 'u',
      otpValidado: true,
      newPassOk: true,
      roles: [],
      permisos: [],
      exp,
    });
    service.classifyAndRoute({
      token,
      newPass: 'N',
      requiereOtp: false,
      requiereEnroll: false,
      roles: [],
      permisos: [],
    });
    expect(router.navigateByUrl).toHaveBeenCalledWith('/dashboard');
    expect(service.state().kind).toBe('success');
  });

  it('classifyAndRoute: respuesta inesperada (sin token ni flags) → telemetría + error', () => {
    const telemetry = TestBed.inject(ClientTelemetryService);
    vi.spyOn(telemetry, 'track').mockImplementation(() => undefined);
    service.classifyAndRoute({
      token: '',
      newPass: 'N',
      requiereOtp: false,
      requiereEnroll: false,
      roles: [],
      permisos: [],
    });
    expect(telemetry.track).toHaveBeenCalled();
    expect(service.state().kind).toBe('error');
  });

  it('handleError: requiereCaptcha', () => {
    service.handleError({
      status: 400,
      mensaje: 'Captcha inválido',
      requiereCaptcha: true,
    });
    expect(service.state().kind).toBe('awaiting-captcha');
  });

  it('handleError: rate-limit', () => {
    service.handleError({
      status: 400,
      mensaje: 'Demasiados intentos, intenta luego',
      requiereCaptcha: false,
    });
    expect(service.state().kind).toBe('rate-limited');
  });

  it('handleError: usuario inactivo → navegación', () => {
    service.handleError({
      status: 403,
      mensaje: 'Usuario inactivo',
      requiereCaptcha: false,
    });
    expect(router.navigate).toHaveBeenCalledWith(['/auth/cuenta-inactiva']);
  });

  it('consumeOtpAttempt: agota intentos', () => {
    const exp = Math.floor(Date.now() / 1000) + 600;
    const token = makeJwt({ sub: 'u', otpValidado: false, newPassOk: true, exp });
    auth.setTemporalToken(token);
    service.setState({ kind: 'awaiting-otp', attemptsRemaining: 1 });
    const telemetry = TestBed.inject(ClientTelemetryService);
    vi.spyOn(telemetry, 'track').mockImplementation(() => undefined);

    const ok = service.consumeOtpAttempt();
    expect(ok).toBe(false);
    expect(telemetry.track).toHaveBeenCalledWith('OTP_LIMIT_EXCEEDED');
    expect(router.navigate).toHaveBeenCalledWith(
      ['/auth/login'],
      expect.objectContaining({ queryParams: { error: 'otp-limit-exceeded' } }),
    );
  });

  it('consumeOtpAttempt: decrementa cuando quedan más', () => {
    service.setState({ kind: 'awaiting-otp', attemptsRemaining: 3 });
    expect(service.consumeOtpAttempt()).toBe(true);
    const s = service.state();
    expect(s.kind).toBe('awaiting-otp');
    if (s.kind === 'awaiting-otp') expect(s.attemptsRemaining).toBe(2);
  });

  it('setReturnUrl ignora vacío → default "/"', () => {
    service.setReturnUrl('');
    expect(service.returnUrl()).toBe('/');
  });
});
