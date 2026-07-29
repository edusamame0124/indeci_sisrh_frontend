import { describe, expect, it, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter, UrlTree } from '@angular/router';
import {
  asistenciaAccessGuard,
  hasAsistenciaAccess,
  hasPlanillaAccess,
  hasPlanillaApprove,
  hasPlanillaMenuAccess,
  hasPlanillaWrite,
  planillaAccessGuard,
  planillaPeriodosGuard,
} from './planilla-access.guard';
import { AuthService } from '../services/auth.service';

describe('hasPlanillaAccess — módulo completo (RBAC V012_45)', () => {
  it('permite SUPER_ADMIN y PLANILLA', () => {
    expect(hasPlanillaAccess(['SUPER_ADMIN'])).toBe(true);
    expect(hasPlanillaAccess(['PLANILLA'])).toBe(true);
  });
  it('deniega ASISTENCIA: solo alcanza Periodos y Gestión de Asistencia', () => {
    expect(hasPlanillaAccess(['ASISTENCIA'])).toBe(false);
  });
  it('deniega el resto de roles funcionales y los retirados', () => {
    expect(hasPlanillaAccess(['VINCULACION'])).toBe(false);
    expect(hasPlanillaAccess(['RRHH_ADMIN'])).toBe(false);
    expect(hasPlanillaAccess(['PLANILLA_ANALISTA'])).toBe(false);
    expect(hasPlanillaAccess(['RRHH_JEFE'])).toBe(false);
    expect(hasPlanillaAccess([])).toBe(false);
  });
});

describe('hasPlanillaMenuAccess — incluye ASISTENCIA (solo Periodos)', () => {
  it('permite SUPER_ADMIN, PLANILLA y ASISTENCIA', () => {
    expect(hasPlanillaMenuAccess(['SUPER_ADMIN'])).toBe(true);
    expect(hasPlanillaMenuAccess(['PLANILLA'])).toBe(true);
    expect(hasPlanillaMenuAccess(['ASISTENCIA'])).toBe(true);
  });
  it('deniega VINCULACION y RRHH_ADMIN', () => {
    expect(hasPlanillaMenuAccess(['VINCULACION'])).toBe(false);
    expect(hasPlanillaMenuAccess(['RRHH_ADMIN'])).toBe(false);
  });
});

describe('hasAsistenciaAccess', () => {
  it('permite SUPER_ADMIN, PLANILLA y ASISTENCIA', () => {
    expect(hasAsistenciaAccess(['SUPER_ADMIN'])).toBe(true);
    expect(hasAsistenciaAccess(['PLANILLA'])).toBe(true);
    expect(hasAsistenciaAccess(['ASISTENCIA'])).toBe(true);
  });
  it('deniega VINCULACION, RRHH_ADMIN y el portal', () => {
    expect(hasAsistenciaAccess(['VINCULACION'])).toBe(false);
    expect(hasAsistenciaAccess(['RRHH_ADMIN'])).toBe(false);
    expect(hasAsistenciaAccess(['EMPLEADO'])).toBe(false);
  });
});

describe('hasPlanillaWrite / hasPlanillaApprove — acciones críticas', () => {
  it('solo SUPER_ADMIN y PLANILLA escriben o aprueban', () => {
    for (const fn of [hasPlanillaWrite, hasPlanillaApprove]) {
      expect(fn(['SUPER_ADMIN'])).toBe(true);
      expect(fn(['PLANILLA'])).toBe(true);
      expect(fn(['ASISTENCIA'])).toBe(false);
      expect(fn(['VINCULACION'])).toBe(false);
      expect(fn(['RRHH_ADMIN'])).toBe(false);
      expect(fn([])).toBe(false);
    }
  });
});

describe('planillaAccessGuard', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  it('permite PLANILLA autenticado', () => {
    const auth = TestBed.inject(AuthService);
    vi.spyOn(auth, 'isAuthenticated').mockReturnValue(true);
    vi.spyOn(auth, 'roles').mockReturnValue(['PLANILLA']);
    const result = TestBed.runInInjectionContext(() =>
      planillaAccessGuard({} as never, { url: '/planilla/movimientos' } as never),
    );
    expect(result).toBe(true);
  });

  it('redirige a / cuando ASISTENCIA intenta entrar al módulo completo', () => {
    const auth = TestBed.inject(AuthService);
    vi.spyOn(auth, 'isAuthenticated').mockReturnValue(true);
    vi.spyOn(auth, 'roles').mockReturnValue(['ASISTENCIA']);
    const result = TestBed.runInInjectionContext(() =>
      planillaAccessGuard({} as never, { url: '/planilla/movimientos' } as never),
    );
    expect(result).toBeInstanceOf(UrlTree);
  });

  it('redirige a /auth/login si no está autenticado', () => {
    const auth = TestBed.inject(AuthService);
    vi.spyOn(auth, 'isAuthenticated').mockReturnValue(false);
    vi.spyOn(auth, 'roles').mockReturnValue([]);
    const result = TestBed.runInInjectionContext(() =>
      planillaAccessGuard({} as never, { url: '/planilla/periodos' } as never),
    );
    expect(result).toBeInstanceOf(UrlTree);
    expect(String(result as UrlTree)).toContain('/auth/login');
  });
});

describe('planillaPeriodosGuard / asistenciaAccessGuard', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  it('ASISTENCIA sí entra a Periodos', () => {
    const auth = TestBed.inject(AuthService);
    vi.spyOn(auth, 'isAuthenticated').mockReturnValue(true);
    vi.spyOn(auth, 'roles').mockReturnValue(['ASISTENCIA']);
    const result = TestBed.runInInjectionContext(() =>
      planillaPeriodosGuard({} as never, { url: '/planilla/periodos' } as never),
    );
    expect(result).toBe(true);
  });

  it('ASISTENCIA sí entra a la carga de asistencia', () => {
    const auth = TestBed.inject(AuthService);
    vi.spyOn(auth, 'isAuthenticated').mockReturnValue(true);
    vi.spyOn(auth, 'roles').mockReturnValue(['ASISTENCIA']);
    const result = TestBed.runInInjectionContext(() =>
      asistenciaAccessGuard({} as never, { url: '/asistencia/carga' } as never),
    );
    expect(result).toBe(true);
  });

  it('RRHH_ADMIN no entra a Periodos', () => {
    const auth = TestBed.inject(AuthService);
    vi.spyOn(auth, 'isAuthenticated').mockReturnValue(true);
    vi.spyOn(auth, 'roles').mockReturnValue(['RRHH_ADMIN']);
    const result = TestBed.runInInjectionContext(() =>
      planillaPeriodosGuard({} as never, { url: '/planilla/periodos' } as never),
    );
    expect(result).toBeInstanceOf(UrlTree);
  });
});
