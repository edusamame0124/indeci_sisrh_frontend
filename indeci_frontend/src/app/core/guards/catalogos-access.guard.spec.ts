import { describe, expect, it, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter, UrlTree } from '@angular/router';
import {
  catalogosAccessGuard,
  hasCatalogosAccess,
  hasCatalogosWrite,
} from './catalogos-access.guard';
import { AuthService } from '../services/auth.service';

describe('hasCatalogosAccess — lectura (RBAC V012_45)', () => {
  it('permite SUPER_ADMIN, RRHH_ADMIN y PLANILLA', () => {
    expect(hasCatalogosAccess(['SUPER_ADMIN'])).toBe(true);
    expect(hasCatalogosAccess(['RRHH_ADMIN'])).toBe(true);
    expect(hasCatalogosAccess(['PLANILLA'])).toBe(true);
  });
  it('deniega VINCULACION, ASISTENCIA y el portal', () => {
    expect(hasCatalogosAccess(['VINCULACION'])).toBe(false);
    expect(hasCatalogosAccess(['ASISTENCIA'])).toBe(false);
    expect(hasCatalogosAccess(['EMPLEADO'])).toBe(false);
    expect(hasCatalogosAccess([])).toBe(false);
  });
});

describe('hasCatalogosWrite — escritura acotada a RRHH_ADMIN', () => {
  it('permite SUPER_ADMIN y RRHH_ADMIN', () => {
    expect(hasCatalogosWrite(['SUPER_ADMIN'])).toBe(true);
    expect(hasCatalogosWrite(['RRHH_ADMIN'])).toBe(true);
  });
  it('deniega PLANILLA: entra solo en lectura', () => {
    expect(hasCatalogosWrite(['PLANILLA'])).toBe(false);
  });
  it('deniega el resto', () => {
    expect(hasCatalogosWrite(['VINCULACION'])).toBe(false);
    expect(hasCatalogosWrite(['ASISTENCIA'])).toBe(false);
    expect(hasCatalogosWrite([])).toBe(false);
  });
});

describe('catalogosAccessGuard', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  it('permite RRHH_ADMIN autenticado', () => {
    const auth = TestBed.inject(AuthService);
    vi.spyOn(auth, 'isAuthenticated').mockReturnValue(true);
    vi.spyOn(auth, 'roles').mockReturnValue(['RRHH_ADMIN']);
    const result = TestBed.runInInjectionContext(() =>
      catalogosAccessGuard({} as never, { url: '/catalogos/bancos' } as never),
    );
    expect(result).toBe(true);
  });

  it('redirige a / cuando no tiene rol autorizado', () => {
    const auth = TestBed.inject(AuthService);
    vi.spyOn(auth, 'isAuthenticated').mockReturnValue(true);
    vi.spyOn(auth, 'roles').mockReturnValue(['VINCULACION']);

    const result = TestBed.runInInjectionContext(() =>
      catalogosAccessGuard({} as never, { url: '/catalogos/bancos' } as never),
    );
    expect(result).toBeInstanceOf(UrlTree);
    expect(String(result as UrlTree)).toContain('/');
  });

  it('redirige a login si no autenticado', () => {
    const auth = TestBed.inject(AuthService);
    vi.spyOn(auth, 'isAuthenticated').mockReturnValue(false);
    vi.spyOn(auth, 'roles').mockReturnValue([]);

    const result = TestBed.runInInjectionContext(() =>
      catalogosAccessGuard({} as never, { url: '/catalogos/bancos' } as never),
    );
    expect(result).toBeInstanceOf(UrlTree);
    expect(String(result as UrlTree)).toContain('/auth/login');
  });
});
