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
 *
 * Spec 013 / C4 — el refresh token vive en cookie HttpOnly: ya no hay token en
 * `localStorage`; el refresh se intenta siempre y la cookie viaja sola.
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

    // Refresh exitoso (el nuevo refresh token va en la cookie, no en el body)
    refreshReqs[0].flush({
      token: 'new-access',
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

    http.get('/api/rrhh/persona').subscribe({ error: () => undefined });

    httpMock.expectOne('/api/rrhh/persona').flush(
      { mensaje: 'Token inválido' },
      { status: 401, statusText: 'Unauthorized' },
    );

    // Refresh dispara y falla con 403 (cookie ausente o expirada en backend)
    httpMock.expectOne('/api/auth/refresh').flush(
      { status: 403, mensaje: 'Refresh expirado', requiereCaptcha: false },
      { status: 403, statusText: 'Forbidden' },
    );

    // Access token limpio
    expect(storage.getAccess()).toBeNull();

    // Navigate a /auth/login con returnUrl
    expect(router.navigate).toHaveBeenCalledWith(
      ['/auth/login'],
      expect.objectContaining({
        queryParams: expect.objectContaining({ returnUrl: '/api/rrhh/persona' }),
      }),
    );
  });

  it('T083 bis: refresh responde 200 sin token → logout', () => {
    storage.setAccess('expired-access');

    http.get('/api/rrhh/persona').subscribe({ error: () => undefined });

    httpMock.expectOne('/api/rrhh/persona').flush(
      { mensaje: 'Token inválido' },
      { status: 401, statusText: 'Unauthorized' },
    );

    // El refresh se intenta siempre; respuesta 200 pero sin token utilizable
    httpMock.expectOne('/api/auth/refresh').flush({ roles: [], permisos: [] });

    expect(storage.getAccess()).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(
      ['/auth/login'],
      expect.objectContaining({
        queryParams: expect.objectContaining({ returnUrl: '/api/rrhh/persona' }),
      }),
    );
  });
});
