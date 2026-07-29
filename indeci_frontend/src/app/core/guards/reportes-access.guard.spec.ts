import { describe, expect, it, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter, UrlTree } from '@angular/router';
import {
  REPORTES_ACCESS_ROLES,
  hasReportesAccess,
  reportesAccessGuard,
} from './reportes-access.guard';
import { AuthService } from '../services/auth.service';

describe('hasReportesAccess (RBAC V012_45)', () => {
  it('permite SUPER_ADMIN, PLANILLA y RRHH_ADMIN', () => {
    expect(hasReportesAccess(['SUPER_ADMIN'])).toBe(true);
    expect(hasReportesAccess(['PLANILLA'])).toBe(true);
    expect(hasReportesAccess(['RRHH_ADMIN'])).toBe(true);
  });
  it('deniega VINCULACION y ASISTENCIA', () => {
    expect(hasReportesAccess(['VINCULACION'])).toBe(false);
    expect(hasReportesAccess(['ASISTENCIA'])).toBe(false);
  });
  it('deniega roles retirados, portal y vacío', () => {
    expect(hasReportesAccess(['RRHH_JEFE'])).toBe(false);
    expect(hasReportesAccess(['RRHH_CONSULTA'])).toBe(false);
    expect(hasReportesAccess(['EMPLEADO'])).toBe(false);
    expect(hasReportesAccess([])).toBe(false);
  });
  it('REPORTES_ACCESS_ROLES contiene exactamente los 3 roles vigentes', () => {
    expect(REPORTES_ACCESS_ROLES).toEqual(['SUPER_ADMIN', 'PLANILLA', 'RRHH_ADMIN']);
  });
});

describe('reportesAccessGuard', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  it('permite PLANILLA autenticado', () => {
    const auth = TestBed.inject(AuthService);
    vi.spyOn(auth, 'isAuthenticated').mockReturnValue(true);
    vi.spyOn(auth, 'roles').mockReturnValue(['PLANILLA']);
    const result = TestBed.runInInjectionContext(() =>
      reportesAccessGuard({} as never, { url: '/reportes/resumen-mensual' } as never),
    );
    expect(result).toBe(true);
  });

  it('redirige a /auth/login si no está autenticado', () => {
    const auth = TestBed.inject(AuthService);
    vi.spyOn(auth, 'isAuthenticated').mockReturnValue(false);
    vi.spyOn(auth, 'roles').mockReturnValue([]);
    const result = TestBed.runInInjectionContext(() =>
      reportesAccessGuard({} as never, { url: '/reportes/resumen-mensual' } as never),
    );
    expect(result).toBeInstanceOf(UrlTree);
    expect(String(result as UrlTree)).toContain('/auth/login');
  });

  it('redirige a / si autenticado sin rol de reportes', () => {
    const auth = TestBed.inject(AuthService);
    vi.spyOn(auth, 'isAuthenticated').mockReturnValue(true);
    vi.spyOn(auth, 'roles').mockReturnValue(['ASISTENCIA']);
    const result = TestBed.runInInjectionContext(() =>
      reportesAccessGuard({} as never, { url: '/reportes/resumen-mensual' } as never),
    );
    expect(result).toBeInstanceOf(UrlTree);
    expect(String(result as UrlTree)).toContain('/');
  });
});
