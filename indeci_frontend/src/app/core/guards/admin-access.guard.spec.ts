import { describe, expect, it, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter, UrlTree } from '@angular/router';

import { adminAccessGuard, hasAdminModuleAccess } from './admin-access.guard';
import { AuthService } from '../services/auth.service';

describe('hasAdminModuleAccess', () => {
  it('permite SUPER_ADMIN', () => {
    expect(hasAdminModuleAccess(['SUPER_ADMIN'])).toBe(true);
  });
  it('permite ADMIN y ADMIN_TI', () => {
    expect(hasAdminModuleAccess(['ADMIN'])).toBe(true);
    expect(hasAdminModuleAccess(['ADMIN_TI'])).toBe(true);
  });
  it('deniega RRHH_ADMIN y roles RRHH operativos', () => {
    expect(hasAdminModuleAccess(['RRHH_ADMIN'])).toBe(false);
    expect(hasAdminModuleAccess(['PLANILLA_ANALISTA'])).toBe(false);
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

  it('permite ADMIN autenticado', () => {
    const auth = TestBed.inject(AuthService);
    vi.spyOn(auth, 'isAuthenticated').mockReturnValue(true);
    vi.spyOn(auth, 'roles').mockReturnValue(['ADMIN']);
    const result = TestBed.runInInjectionContext(() =>
      adminAccessGuard({} as never, { url: '/admin/usuarios' } as never),
    );
    expect(result).toBe(true);
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
