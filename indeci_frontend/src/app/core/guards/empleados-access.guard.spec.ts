import { describe, expect, it, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter, UrlTree } from '@angular/router';
import { empleadosAccessGuard, hasEmpleadosAccess } from './empleados-access.guard';
import { AuthService } from '../services/auth.service';

describe('hasEmpleadosAccess', () => {
  it('allows ADMIN', () => {
    expect(hasEmpleadosAccess(['ADMIN'])).toBe(true);
  });
  it('allows RRHH_ADMIN', () => {
    expect(hasEmpleadosAccess(['RRHH_ADMIN', 'AREA'])).toBe(true);
  });
  it('allows SUPER_ADMIN', () => {
    expect(hasEmpleadosAccess(['SUPER_ADMIN'])).toBe(true);
  });
  it('denies otros', () => {
    expect(hasEmpleadosAccess(['POSTULANTE'])).toBe(false);
  });
});

describe('empleadosAccessGuard', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  it('permite ADMIN autenticado', () => {
    const auth = TestBed.inject(AuthService);
    vi.spyOn(auth, 'isAuthenticated').mockReturnValue(true);
    vi.spyOn(auth, 'roles').mockReturnValue(['ADMIN']);
    const result = TestBed.runInInjectionContext(() =>
      empleadosAccessGuard({} as never, { url: '/empleados/personas' } as never),
    );
    expect(result).toBe(true);
  });

  it('permite RRHH_ADMIN autenticado', () => {
    const auth = TestBed.inject(AuthService);
    vi.spyOn(auth, 'isAuthenticated').mockReturnValue(true);
    vi.spyOn(auth, 'roles').mockReturnValue(['RRHH_ADMIN']);
    const result = TestBed.runInInjectionContext(() =>
      empleadosAccessGuard({} as never, { url: '/empleados/puesto' } as never),
    );
    expect(result).toBe(true);
  });

  it('redirige a /auth/login cuando no está autenticado', () => {
    const auth = TestBed.inject(AuthService);
    vi.spyOn(auth, 'isAuthenticated').mockReturnValue(false);
    vi.spyOn(auth, 'roles').mockReturnValue([]);

    const result = TestBed.runInInjectionContext(() =>
      empleadosAccessGuard({} as never, { url: '/empleados/personas' } as never),
    );
    expect(result).toBeInstanceOf(UrlTree);
    expect(String(result as UrlTree)).toContain('/auth/login');
  });

  it('redirige a / cuando autenticado pero sin rol RRHH', () => {
    const auth = TestBed.inject(AuthService);
    vi.spyOn(auth, 'isAuthenticated').mockReturnValue(true);
    vi.spyOn(auth, 'roles').mockReturnValue(['SOLICITANTE']);

    const result = TestBed.runInInjectionContext(() =>
      empleadosAccessGuard({} as never, { url: '/empleados/personas' } as never),
    );
    expect(result).toBeInstanceOf(UrlTree);
    expect(String(result as UrlTree)).toContain('/');
  });
});
