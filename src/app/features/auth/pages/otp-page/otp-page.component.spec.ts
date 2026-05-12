import { describe, expect, it, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { OtpPageComponent } from './otp-page.component';
import { LoginFlowService } from '../../services/login-flow.service';
import { AuthService } from '../../../../core/services/auth.service';

describe('OtpPageComponent (US1 integration)', () => {
  let httpMock: HttpTestingController;
  let flow: LoginFlowService;
  let auth: AuthService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [OtpPageComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync('noop'),
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    flow = TestBed.inject(LoginFlowService);
    auth = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
    // Setup flow as if we just came from login
    flow.setState({ kind: 'awaiting-otp', attemptsRemaining: 5 });
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  it('valid code → setSession + navigate to /', () => {
    const fixture = TestBed.createComponent(OtpPageComponent);
    fixture.detectChanges();

    fixture.componentInstance.onCodeCompleted('123456');
    const req = httpMock.expectOne('/api/auth/otp/confirm');
    expect(req.request.body).toEqual({ codigo: '123456' });

    req.flush({
      token: 'access-final',
      refreshToken: 'refresh-24h',
      roles: ['ADMIN'],
      permisos: ['READ'],
      newPass: 'N',
      requiereOtp: false,
      requiereEnroll: false,
    });

    expect(auth.accessToken()).toBe('access-final');
    expect(router.navigateByUrl).toHaveBeenCalled();
  });

  it('invalid code → increments failedAttempts and shows error', () => {
    const fixture = TestBed.createComponent(OtpPageComponent);
    fixture.detectChanges();

    fixture.componentInstance.onCodeCompleted('000000');
    httpMock.expectOne('/api/auth/otp/confirm').flush(
      { status: 400, mensaje: 'Código OTP inválido', requiereCaptcha: false },
      { status: 400, statusText: 'Bad Request' },
    );

    expect(fixture.componentInstance.failedAttempts()).toBe(1);
    expect(fixture.componentInstance.errorMessage()).toContain('Código incorrecto');
  });

  it('after 3 failed attempts shows hour-sync hint (FR-012)', () => {
    const fixture = TestBed.createComponent(OtpPageComponent);
    fixture.detectChanges();

    for (let i = 0; i < 3; i++) {
      fixture.componentInstance.onCodeCompleted('000000');
      httpMock.expectOne('/api/auth/otp/confirm').flush(
        { status: 400, mensaje: 'Código OTP inválido', requiereCaptcha: false },
        { status: 400, statusText: 'Bad Request' },
      );
    }

    fixture.detectChanges();
    expect(fixture.componentInstance.showHourHint()).toBe(true);
  });

  it('OTP no generado clears session and navigates to login', () => {
    const fixture = TestBed.createComponent(OtpPageComponent);
    fixture.detectChanges();

    fixture.componentInstance.onCodeCompleted('111111');
    httpMock.expectOne('/api/auth/otp/confirm').flush(
      { status: 400, mensaje: 'OTP no generado', requiereCaptcha: false },
      { status: 400, statusText: 'Bad Request' },
    );

    expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
  });
});
