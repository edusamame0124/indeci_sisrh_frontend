import { describe, expect, it, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { provideRouter } from '@angular/router';
import { authInterceptor } from './auth.interceptor';
import { TokenStorageService } from '../services/token-storage.service';

/**
 * Tests US4 (T082, T083) — escenarios de cola del refresh transparente.
 * Complementan los tests básicos en auth.interceptor.spec.ts (Phase 2).
 */
describe('authInterceptor — queue + returnUrl scenarios (US4)', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let storage: TokenStorageService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    storage = TestBed.inject(TokenStorageService);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    if (typeof localStorage !== 'undefined') localStorage.clear();
  });

  it('T082: 3 simultaneous 401s trigger ONE refresh + 3 retries with new token', () => {
    storage.setAccess('expired-access');
    storage.setRefresh('valid-refresh');

    // Disparar 3 peticiones simultáneas
    const responses: unknown[] = [];
    http.get('/api/rrhh/persona').subscribe({
      next: (r) => responses.push(r),
      error: () => undefined,
    });
    http.get('/api/rrhh/empleado').subscribe({
      next: (r) => responses.push(r),
      error: () => undefined,
    });
    http.get('/api/rrhh/banco').subscribe({
      next: (r) => responses.push(r),
      error: () => undefined,
    });

    // Las 3 reciben 401
    httpMock.expectOne('/api/rrhh/persona').flush(
      { mensaje: 'Token inválido' },
      { status: 401, statusText: 'Unauthorized' },
    );
    httpMock.expectOne('/api/rrhh/empleado').flush(
      { mensaje: 'Token inválido' },
      { status: 401, statusText: 'Unauthorized' },
    );
    httpMock.expectOne('/api/rrhh/banco').flush(
      { mensaje: 'Token inválido' },
      { status: 401, statusText: 'Unauthorized' },
    );

    // El interceptor debe disparar EXACTAMENTE UN refresh
    const refreshReqs = httpMock.match('/api/auth/refresh');
    expect(refreshReqs.length).toBe(1);

    // Refresh exitoso
    refreshReqs[0].flush({
      token: 'new-access',
      refreshToken: 'new-refresh',
      roles: [],
      permisos: [],
    });

    // Las 3 peticiones originales deben reintentarse con el nuevo token
    const retryPersona = httpMock.expectOne('/api/rrhh/persona');
    expect(retryPersona.request.headers.get('Authorization')).toBe('Bearer new-access');
    retryPersona.flush({ data: 'persona-result' });

    const retryEmpleado = httpMock.expectOne('/api/rrhh/empleado');
    expect(retryEmpleado.request.headers.get('Authorization')).toBe('Bearer new-access');
    retryEmpleado.flush({ data: 'empleado-result' });

    const retryBanco = httpMock.expectOne('/api/rrhh/banco');
    expect(retryBanco.request.headers.get('Authorization')).toBe('Bearer new-access');
    retryBanco.flush({ data: 'banco-result' });

    expect(responses.length).toBe(3);
  });

  it('T083: refresh fails → clearSession + navigate /auth/login with returnUrl', () => {
    storage.setAccess('expired-access');
    storage.setRefresh('expired-refresh');

    http.get('/api/rrhh/persona').subscribe({ error: () => undefined });

    httpMock.expectOne('/api/rrhh/persona').flush(
      { mensaje: 'Token inválido' },
      { status: 401, statusText: 'Unauthorized' },
    );

    // Refresh dispara y falla con 403
    httpMock.expectOne('/api/auth/refresh').flush(
      { status: 403, mensaje: 'Refresh expirado', requiereCaptcha: false },
      { status: 403, statusText: 'Forbidden' },
    );

    // Tokens limpios
    expect(storage.getAccess()).toBeNull();
    expect(storage.getRefresh()).toBeNull();

    // Navigate a /auth/login con returnUrl
    expect(router.navigate).toHaveBeenCalledWith(
      ['/auth/login'],
      expect.objectContaining({
        queryParams: expect.objectContaining({ returnUrl: '/api/rrhh/persona' }),
      }),
    );
  });

  it('T083 bis: refresh fails when no refreshToken in storage → immediate logout', () => {
    storage.setAccess('expired-access');
    // NO setRefresh — no hay refresh disponible

    http.get('/api/rrhh/persona').subscribe({ error: () => undefined });

    httpMock.expectOne('/api/rrhh/persona').flush(
      { mensaje: 'Token inválido' },
      { status: 401, statusText: 'Unauthorized' },
    );

    // NO debe haber petición a /api/auth/refresh (no hay refresh token)
    httpMock.expectNone('/api/auth/refresh');

    // Logout directo
    expect(storage.getAccess()).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(
      ['/auth/login'],
      expect.objectContaining({
        queryParams: expect.objectContaining({ returnUrl: '/api/rrhh/persona' }),
      }),
    );
  });
});
