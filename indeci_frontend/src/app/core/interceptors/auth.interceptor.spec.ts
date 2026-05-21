import { describe, expect, it, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { authInterceptor } from './auth.interceptor';
import { TokenStorageService } from '../services/token-storage.service';

/**
 * Tests del interceptor: Bearer injection + 401 refresh + cola.
 * Tests más exhaustivos de la cola se añaden en US4 (T082).
 */
describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let storage: TokenStorageService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
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

  it('injects Bearer header when accessToken exists and endpoint is not public', () => {
    storage.setAccess('test-access-token');
    http.get('/api/rrhh/persona').subscribe();
    const req = httpMock.expectOne('/api/rrhh/persona');
    expect(req.request.headers.get('Authorization')).toBe('Bearer test-access-token');
    req.flush({});
  });

  it('does NOT inject Bearer for /api/auth/login (public)', () => {
    storage.setAccess('test-access-token');
    http.post('/api/auth/login', { username: 'x', password: 'y' }).subscribe();
    const req = httpMock.expectOne('/api/auth/login');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('does NOT inject Bearer for /api/auth/refresh (public)', () => {
    storage.setAccess('test-access-token');
    http.post('/api/auth/refresh', {}).subscribe();
    const req = httpMock.expectOne('/api/auth/refresh');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('triggers refresh on 401 and redirects to login on refresh failure', () => {
    storage.setAccess('expired-access');

    http.get('/api/rrhh/persona').subscribe({ error: () => undefined });
    const req1 = httpMock.expectOne('/api/rrhh/persona');
    req1.flush({ mensaje: 'Token inválido' }, { status: 401, statusText: 'Unauthorized' });

    // Interceptor disparó POST /api/auth/refresh
    const refreshReq = httpMock.expectOne('/api/auth/refresh');
    refreshReq.flush({ mensaje: 'Refresh inválido' }, { status: 403, statusText: 'Forbidden' });

    expect(router.navigate).toHaveBeenCalledWith(
      ['/auth/login'],
      expect.objectContaining({ queryParams: expect.objectContaining({ returnUrl: '/api/rrhh/persona' }) }),
    );
  });
});
