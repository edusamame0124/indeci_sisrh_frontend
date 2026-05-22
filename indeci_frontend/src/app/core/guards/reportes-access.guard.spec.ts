import { describe, expect, it, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter, UrlTree } from '@angular/router';
import {
  REPORTES_ACCESS_ROLES,
  hasReportesAccess,
  reportesAccessGuard,
} from './reportes-access.guard';
import { AuthService } from '../services/auth.service';

describe('hasReportesAccess', () => {
  it('permite ADMIN', () => {
    expect(hasReportesAccess(['ADMIN'])).toBe(true);
  });
  it('permite SUPER_ADMIN', () => {
    expect(hasReportesAccess(['SUPER_ADMIN'])).toBe(true);
  });
  it('rechaza RRHH_ADMIN (decisión clarify: Reportes solo ADMIN/SUPER_ADMIN)', () => {
    expect(hasReportesAccess(['RRHH_ADMIN'])).toBe(false);
  });
  it('rechaza otros roles', () => {
    expect(hasReportesAccess(['SOLICITANTE'])).toBe(false);
    expect(hasReportesAccess([])).toBe(false);
  });
  it('expone solo 2 roles en REPORTES_ACCESS_ROLES', () => {
    expect([...REPORTES_ACCESS_ROLES]).toEqual(['ADMIN', 'SUPER_ADMIN']);
  });
});

describe('reportesAccessGuard', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  it('permite SUPER_ADMIN autenticado', () => {
    const auth = TestBed.inject(AuthService);
    vi.spyOn(auth, 'isAuthenticated').mockReturnValue(true);
    vi.spyOn(auth, 'roles').mockReturnValue(['SUPER_ADMIN']);
    const result = TestBed.runInInjectionContext(() =>
      reportesAccessGuard({} as never, { url: '/reportes/boleta/42/2026-05' } as never),
    );
    expect(result).toBe(true);
  });

  it('redirige a /auth/login si no está autenticado', () => {
    const auth = TestBed.inject(AuthService);
    vi.spyOn(auth, 'isAuthenticated').mockReturnValue(false);
    vi.spyOn(auth, 'roles').mockReturnValue([]);
    const result = TestBed.runInInjectionContext(() =>
      reportesAccessGuard({} as never, { url: '/reportes/boleta/42/2026-05' } as never),
    );
    expect(result).toBeInstanceOf(UrlTree);
    expect(String(result as UrlTree)).toContain('/auth/login');
  });

  it('redirige a / si autenticado pero sin rol ADMIN/SUPER_ADMIN (RRHH_ADMIN no entra)', () => {
    const auth = TestBed.inject(AuthService);
    vi.spyOn(auth, 'isAuthenticated').mockReturnValue(true);
    vi.spyOn(auth, 'roles').mockReturnValue(['RRHH_ADMIN']);
    const result = TestBed.runInInjectionContext(() =>
      reportesAccessGuard({} as never, { url: '/reportes/boleta/42/2026-05' } as never),
    );
    expect(result).toBeInstanceOf(UrlTree);
    expect(String(result as UrlTree)).toContain('/');
  });
});
