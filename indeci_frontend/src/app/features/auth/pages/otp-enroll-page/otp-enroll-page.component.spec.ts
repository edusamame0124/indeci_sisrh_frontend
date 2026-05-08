import { describe, expect, it, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { OtpEnrollPageComponent } from './otp-enroll-page.component';
import { AuthService } from '../../../../core/services/auth.service';

describe('OtpEnrollPageComponent (US2 integration)', () => {
  let httpMock: HttpTestingController;
  let auth: AuthService;
  let router: Router;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      imports: [OtpEnrollPageComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync('noop'),
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('on init calls /api/auth/otp/enroll and shows QR on success', () => {
    const fixture = TestBed.createComponent(OtpEnrollPageComponent);
    fixture.detectChanges();

    const req = httpMock.expectOne('/api/auth/otp/enroll');
    expect(req.request.method).toBe('POST');
    req.flush({ qrImage: 'data:image/png;base64,FAKE==' });

    fixture.detectChanges();
    expect(fixture.componentInstance.qrDataUrl()).toBe('data:image/png;base64,FAKE==');
    expect(fixture.componentInstance.loadingQr()).toBe(false);
  });

  it('redirects to login when enroll returns "OTP ya está configurado" (T074, edge case)', () => {
    const fixture = TestBed.createComponent(OtpEnrollPageComponent);
    fixture.detectChanges();

    httpMock.expectOne('/api/auth/otp/enroll').flush(
      { status: 400, mensaje: 'OTP ya está configurado', requiereCaptcha: false },
      { status: 400, statusText: 'Bad Request' },
    );

    expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
  });

  it('on confirm success → setSession + navigate (after snackbar delay)', () => {
    const fixture = TestBed.createComponent(OtpEnrollPageComponent);
    fixture.detectChanges();

    httpMock.expectOne('/api/auth/otp/enroll').flush({ qrImage: 'data:image/png;base64,FAKE==' });
    fixture.detectChanges();

    fixture.componentInstance.onConfirmCode('654321');

    const confirmReq = httpMock.expectOne('/api/auth/otp/confirm');
    expect(confirmReq.request.body).toEqual({ codigo: '654321' });

    confirmReq.flush({
      token: 'access-final',
      refreshToken: 'refresh-24h',
      roles: ['EMPLEADO'],
      permisos: [],
      newPass: 'N',
      requiereOtp: false,
      requiereEnroll: false,
    });

    expect(auth.accessToken()).toBe('access-final');

    // Navega después del setTimeout (800ms)
    vi.advanceTimersByTime(900);
    expect(router.navigateByUrl).toHaveBeenCalled();
  });

  it('on confirm error shows error message and does NOT setSession', () => {
    const fixture = TestBed.createComponent(OtpEnrollPageComponent);
    fixture.detectChanges();

    httpMock.expectOne('/api/auth/otp/enroll').flush({ qrImage: 'data:image/png;base64,FAKE==' });
    fixture.detectChanges();

    fixture.componentInstance.onConfirmCode('000000');
    httpMock.expectOne('/api/auth/otp/confirm').flush(
      { status: 400, mensaje: 'Código OTP inválido', requiereCaptcha: false },
      { status: 400, statusText: 'Bad Request' },
    );

    expect(fixture.componentInstance.confirmError()).toContain('Código incorrecto');
    expect(auth.accessToken()).toBeNull();
  });
});
