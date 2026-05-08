import { describe, expect, it, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { errorRoutingInterceptor } from './error-routing.interceptor';

describe('errorRoutingInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorRoutingInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  it('navigates to /auth/otp on 403 "Debe validar OTP"', () => {
    http.get('/api/test').subscribe({ error: () => undefined });
    const req = httpMock.expectOne('/api/test');
    req.flush(
      { status: 403, mensaje: 'Debe validar OTP', requiereCaptcha: false },
      { status: 403, statusText: 'Forbidden' },
    );
    expect(router.navigate).toHaveBeenCalledWith(['/auth/otp']);
  });

  it('navigates to /auth/cambiar-clave on 403 "Debe cambiar contraseña"', () => {
    http.get('/api/test').subscribe({ error: () => undefined });
    httpMock.expectOne('/api/test').flush(
      { status: 403, mensaje: 'Debe cambiar contraseña', requiereCaptcha: false },
      { status: 403, statusText: 'Forbidden' },
    );
    expect(router.navigate).toHaveBeenCalledWith(['/auth/cambiar-clave']);
  });

  it('navigates to /auth/cuenta-inactiva on 403 "Usuario inactivo"', () => {
    http.get('/api/test').subscribe({ error: () => undefined });
    httpMock.expectOne('/api/test').flush(
      { status: 403, mensaje: 'Usuario inactivo', requiereCaptcha: false },
      { status: 403, statusText: 'Forbidden' },
    );
    expect(router.navigate).toHaveBeenCalledWith(['/auth/cuenta-inactiva']);
  });

  it('does NOT navigate on non-403 errors', () => {
    http.get('/api/test').subscribe({ error: () => undefined });
    httpMock.expectOne('/api/test').flush(
      { status: 400, mensaje: 'Algo', requiereCaptcha: false },
      { status: 400, statusText: 'Bad Request' },
    );
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
