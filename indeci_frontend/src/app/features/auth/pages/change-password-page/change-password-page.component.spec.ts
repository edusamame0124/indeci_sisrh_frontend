import { describe, expect, it, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { ChangePasswordPageComponent } from './change-password-page.component';
import { LoginFlowService } from '../../services/login-flow.service';
import { AuthService } from '../../../../core/services/auth.service';

function makeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS384' }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.sig`;
}

describe('ChangePasswordPageComponent (US3 integration)', () => {
  let httpMock: HttpTestingController;
  let auth: AuthService;
  let flow: LoginFlowService;
  let router: Router;
  const futureExp = Math.floor(Date.now() / 1000) + 900; // 15 min

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ChangePasswordPageComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync('noop'),
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    flow = TestBed.inject(LoginFlowService);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    vi.spyOn(flow, 'classifyAndRoute').mockImplementation(() => undefined);

    // Setup: simular que llegamos con un token cambio-clave válido
    const token = makeJwt({
      sub: 'jdoe',
      otpValidado: true,
      newPassOk: false,
      roles: [],
      permisos: [],
      exp: futureExp,
    });
    auth.setTemporalToken(token);
  });

  afterEach(() => {
    auth.clearSession();
    if (typeof localStorage !== 'undefined') localStorage.clear();
  });

  it('canSubmit is false when password does not meet complexity', () => {
    const fixture = TestBed.createComponent(ChangePasswordPageComponent);
    fixture.detectChanges();

    fixture.componentInstance.form.setValue({ nuevaClave: 'abc', confirmarClave: 'abc' });
    expect(fixture.componentInstance.canSubmit()).toBe(false);
  });

  it('canSubmit is false when passwords do not match', () => {
    const fixture = TestBed.createComponent(ChangePasswordPageComponent);
    fixture.detectChanges();

    fixture.componentInstance.form.setValue({
      nuevaClave: 'NuevaClave2026!',
      confirmarClave: 'OtraClave2026!',
    });
    fixture.componentInstance.form.get('confirmarClave')?.markAsTouched();
    expect(fixture.componentInstance.canSubmit()).toBe(false);
    expect(fixture.componentInstance.passwordsMismatch()).toBe(true);
  });

  it('canSubmit is true with valid complex password and matching confirmation', () => {
    const fixture = TestBed.createComponent(ChangePasswordPageComponent);
    fixture.detectChanges();

    fixture.componentInstance.form.setValue({
      nuevaClave: 'NuevaClave2026!',
      confirmarClave: 'NuevaClave2026!',
    });
    expect(fixture.componentInstance.canSubmit()).toBe(true);
  });

  it('on submit: POSTs change-password and re-logs in with new credentials', () => {
    const fixture = TestBed.createComponent(ChangePasswordPageComponent);
    fixture.detectChanges();

    fixture.componentInstance.form.setValue({
      nuevaClave: 'NuevaClave2026!',
      confirmarClave: 'NuevaClave2026!',
    });
    fixture.componentInstance.submit();

    const changeReq = httpMock.expectOne('/api/auth/cambiar-clave');
    expect(changeReq.request.body).toEqual({ nuevaClave: 'NuevaClave2026!' });
    changeReq.flush({
      token: 'new-temporal',
      refreshToken: null,
      newPass: 'N',
      requiereOtp: false,
      requiereEnroll: false,
      roles: null,
      permisos: null,
    });

    // Tras 200 OK del cambio → re-login automático con username de claims + nueva clave
    const loginReq = httpMock.expectOne('/api/auth/login');
    expect(loginReq.request.body).toEqual({ username: 'jdoe', password: 'NuevaClave2026!' });
    loginReq.flush({
      token: 'temporal-after-relogin',
      requiereOtp: true,
      requiereEnroll: false,
      newPass: 'N',
      roles: [],
      permisos: [],
    });

    expect(flow.classifyAndRoute).toHaveBeenCalledWith(
      expect.objectContaining({ requiereOtp: true }),
    );
  });

  it('on "Usuario ya cambió su contraseña" → clearSession + navigate /auth/login', () => {
    const fixture = TestBed.createComponent(ChangePasswordPageComponent);
    fixture.detectChanges();

    fixture.componentInstance.form.setValue({
      nuevaClave: 'NuevaClave2026!',
      confirmarClave: 'NuevaClave2026!',
    });
    fixture.componentInstance.submit();

    httpMock.expectOne('/api/auth/cambiar-clave').flush(
      { status: 400, mensaje: 'Usuario ya cambió su contraseña', requiereCaptcha: false },
      { status: 400, statusText: 'Bad Request' },
    );

    expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
    expect(auth.accessToken()).toBeNull();
  });

  it('clears the form after successful submit (no password retained in memory)', () => {
    const fixture = TestBed.createComponent(ChangePasswordPageComponent);
    fixture.detectChanges();

    fixture.componentInstance.form.setValue({
      nuevaClave: 'NuevaClave2026!',
      confirmarClave: 'NuevaClave2026!',
    });
    fixture.componentInstance.submit();

    httpMock.expectOne('/api/auth/cambiar-clave').flush({ token: 'x', newPass: 'N' });
    httpMock.expectOne('/api/auth/login').flush({
      token: 'temp',
      requiereOtp: true,
      requiereEnroll: false,
      newPass: 'N',
      roles: [],
      permisos: [],
    });

    expect(fixture.componentInstance.form.value.nuevaClave).toBeNull();
    expect(fixture.componentInstance.form.value.confirmarClave).toBeNull();
  });
});
