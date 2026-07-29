import { describe, expect, it, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter, UrlTree } from '@angular/router';

import { adminAccessGuard, hasAdminModuleAccess } from './admin-access.guard';
import { AuthService } from '../services/auth.service';

describe('hasAdminModuleAccess', () => {
  it('permite SUPER_ADMIN', () => {
    expect(hasAdminModuleAccess(['SUPER_ADMIN'])).toBe(true);
  });
  it('permite el rol acotado GESTOR_USUARIOS', () => {
    expect(hasAdminModuleAccess(['GESTOR_USUARIOS'])).toBe(true);
  });
  it('deniega todos los roles funcionales y los retirados', () => {
    expect(hasAdminModuleAccess(['PLANILLA'])).toBe(false);
    expect(hasAdminModuleAccess(['VINCULACION'])).toBe(false);
    expect(hasAdminModuleAccess(['ASISTENCIA'])).toBe(false);
    expect(hasAdminModuleAccess(['RRHH_ADMIN'])).toBe(false);
    expect(hasAdminModuleAccess(['ADMIN_TI'])).toBe(false);
    expect(hasAdminModuleAccess(['RRHH_JEFE'])).toBe(false);
  });
  it('SUPER_ADMIN tiene prioridad ante otros', () => {
    expect(hasAdminModuleAccess(['RRHH_ADMIN', 'SUPER_ADMIN'])).toBe(true);
  });
});

describe('adminAccessGuard', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  it('permite SUPER_ADMIN autenticado', () => {
    const auth = TestBed.inject(AuthService);
    vi.spyOn(auth, 'isAuthenticated').mockReturnValue(true);
    vi.spyOn(auth, 'roles').mockReturnValue(['SUPER_ADMIN']);
    const result = TestBed.runInInjectionContext(() =>
      adminAccessGuard({} as never, { url: '/admin/usuarios' } as never),
    );
    expect(result).toBe(true);
  });

  it('redirige a / cuando el rol es funcional pero no de administración', () => {
    const auth = TestBed.inject(AuthService);
    vi.spyOn(auth, 'isAuthenticated').mockReturnValue(true);
    vi.spyOn(auth, 'roles').mockReturnValue(['PLANILLA']);

    const result = TestBed.runInInjectionContext(() =>
      adminAccessGuard({} as never, { url: '/admin/usuarios' } as never),
    );
    expect(result).toBeInstanceOf(UrlTree);
    expect(String(result as UrlTree)).toContain('/');
  });

  it('redirige a / cuando roles insuficientes', () => {
    const auth = TestBed.inject(AuthService);
    vi.spyOn(auth, 'isAuthenticated').mockReturnValue(true);
    vi.spyOn(auth, 'roles').mockReturnValue(['AREA']);

    const result = TestBed.runInInjectionContext(() =>
      adminAccessGuard({} as never, { url: '/admin/usuarios' } as never),
    );
    expect(result).toBeInstanceOf(UrlTree);
    expect(String(result as UrlTree)).toContain('/');
  });

  it('redirige a login si no autenticado', () => {
    const auth = TestBed.inject(AuthService);
    vi.spyOn(auth, 'isAuthenticated').mockReturnValue(false);
    vi.spyOn(auth, 'roles').mockReturnValue([]);

    const result = TestBed.runInInjectionContext(() =>
      adminAccessGuard({} as never, { url: '/admin/usuarios' } as never),
    );
    expect(result).toBeInstanceOf(UrlTree);
    expect(String(result as UrlTree)).toContain('/auth/login');
  });
});
