import { describe, expect, it, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter, UrlTree } from '@angular/router';
import { catalogosAccessGuard, hasCatalogosAccess } from './catalogos-access.guard';
import { AuthService } from '../services/auth.service';

describe('hasCatalogosAccess', () => {
  it('permite ADMIN', () => {
    expect(hasCatalogosAccess(['ADMIN'])).toBe(true);
  });
  it('permite SUPER_ADMIN', () => {
    expect(hasCatalogosAccess(['SUPER_ADMIN'])).toBe(true);
  });
  it('deniega RRHH_ADMIN', () => {
    expect(hasCatalogosAccess(['RRHH_ADMIN'])).toBe(false);
  });
  it('deniega otros', () => {
    expect(hasCatalogosAccess([])).toBe(false);
  });
});

describe('catalogosAccessGuard', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  it('permite ADMIN autenticado', () => {
    const auth = TestBed.inject(AuthService);
    vi.spyOn(auth, 'isAuthenticated').mockReturnValue(true);
    vi.spyOn(auth, 'roles').mockReturnValue(['ADMIN']);
    const result = TestBed.runInInjectionContext(() =>
      catalogosAccessGuard({} as never, { url: '/catalogos/bancos' } as never),
    );
    expect(result).toBe(true);
  });

  it('redirige a / cuando no tiene rol ADMIN', () => {
    const auth = TestBed.inject(AuthService);
    vi.spyOn(auth, 'isAuthenticated').mockReturnValue(true);
    vi.spyOn(auth, 'roles').mockReturnValue(['RRHH_ADMIN']);

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
