import { describe, expect, it, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter, UrlTree } from '@angular/router';
import { gestionesPersonalGuard, hasGestionesPersonalAccess } from './empleados-access.guard';
import { AuthService } from '../services/auth.service';

describe('hasGestionesPersonalAccess (RBAC V012_45)', () => {
  it('permite los roles del portal', () => {
    expect(hasGestionesPersonalAccess(['EMPLEADO'])).toBe(true);
    expect(hasGestionesPersonalAccess(['JEFE'])).toBe(true);
    expect(hasGestionesPersonalAccess(['RRHH_PAPELETA'])).toBe(true);
  });

  it('deniega los roles operativos: papeletas es autoservicio', () => {
    expect(hasGestionesPersonalAccess(['PLANILLA'])).toBe(false);
    expect(hasGestionesPersonalAccess(['VINCULACION'])).toBe(false);
    expect(hasGestionesPersonalAccess(['ASISTENCIA'])).toBe(false);
    expect(hasGestionesPersonalAccess(['RRHH_ADMIN'])).toBe(false);
    expect(hasGestionesPersonalAccess(['SUPER_ADMIN'])).toBe(false);
  });

  it('deniega roles retirados y vacíos', () => {
    expect(hasGestionesPersonalAccess(['RRHH_ANALISTA'])).toBe(false);
    expect(hasGestionesPersonalAccess([])).toBe(false);
  });
});

describe('gestionesPersonalGuard', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  it('permite EMPLEADO autenticado', () => {
    const auth = TestBed.inject(AuthService);
    vi.spyOn(auth, 'isAuthenticated').mockReturnValue(true);
    vi.spyOn(auth, 'roles').mockReturnValue(['EMPLEADO']);
    const result = TestBed.runInInjectionContext(() =>
      gestionesPersonalGuard({} as never, { url: '/gestiones-personal/empleado' } as never),
    );
    expect(result).toBe(true);
  });

  it('redirige a /auth/login cuando no está autenticado', () => {
    const auth = TestBed.inject(AuthService);
    vi.spyOn(auth, 'isAuthenticated').mockReturnValue(false);
    vi.spyOn(auth, 'roles').mockReturnValue([]);

    const result = TestBed.runInInjectionContext(() =>
      gestionesPersonalGuard({} as never, { url: '/gestiones-personal/empleado' } as never),
    );
    expect(result).toBeInstanceOf(UrlTree);
    expect(String(result as UrlTree)).toContain('/auth/login');
  });

  it('redirige a / cuando autenticado sin rol del portal', () => {
    const auth = TestBed.inject(AuthService);
    vi.spyOn(auth, 'isAuthenticated').mockReturnValue(true);
    vi.spyOn(auth, 'roles').mockReturnValue(['PLANILLA']);

    const result = TestBed.runInInjectionContext(() =>
      gestionesPersonalGuard({} as never, { url: '/gestiones-personal/empleado' } as never),
    );
    expect(result).toBeInstanceOf(UrlTree);
    expect(String(result as UrlTree)).toContain('/');
  });
});
