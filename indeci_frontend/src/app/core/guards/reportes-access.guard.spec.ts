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
  it('permite roles TI', () => {
    expect(hasReportesAccess(['ADMIN'])).toBe(true);
    expect(hasReportesAccess(['ADMIN_TI'])).toBe(true);
    expect(hasReportesAccess(['SUPER_ADMIN'])).toBe(true);
  });
  it('permite RRHH_JEFE y RRHH_CONSULTA', () => {
    expect(hasReportesAccess(['RRHH_JEFE'])).toBe(true);
    expect(hasReportesAccess(['RRHH_CONSULTA'])).toBe(true);
  });
  it('permite analistas de planilla (archivo bancos / AIRHSP)', () => {
    expect(hasReportesAccess(['PLANILLA_ANALISTA'])).toBe(true);
    expect(hasReportesAccess(['PLANILLA_APROBADOR'])).toBe(true);
  });
  it('rechaza RRHH_ADMIN legacy sin ampliación', () => {
    expect(hasReportesAccess(['RRHH_ADMIN'])).toBe(false);
  });
  it('rechaza roles desconocidos', () => {
    expect(hasReportesAccess(['SOLICITANTE'])).toBe(false);
    expect(hasReportesAccess([])).toBe(false);
  });
  it('incluye roles TI y RRHH de reportes en REPORTES_ACCESS_ROLES', () => {
    expect(REPORTES_ACCESS_ROLES).toContain('SUPER_ADMIN');
    expect(REPORTES_ACCESS_ROLES).toContain('ADMIN_TI');
    expect(REPORTES_ACCESS_ROLES).toContain('PLANILLA_ANALISTA');
    expect(REPORTES_ACCESS_ROLES).toContain('RRHH_CONSULTA');
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

  it('redirige a / si autenticado sin rol de reportes', () => {
    const auth = TestBed.inject(AuthService);
    vi.spyOn(auth, 'isAuthenticated').mockReturnValue(true);
    vi.spyOn(auth, 'roles').mockReturnValue(['RRHH_ANALISTA']);
    const result = TestBed.runInInjectionContext(() =>
      reportesAccessGuard({} as never, { url: '/reportes/boleta/42/2026-05' } as never),
    );
    expect(result).toBeInstanceOf(UrlTree);
    expect(String(result as UrlTree)).toContain('/');
  });
});
