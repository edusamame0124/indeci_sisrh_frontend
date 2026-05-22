import { describe, expect, it, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter, UrlTree } from '@angular/router';
import { hasPlanillaAccess, planillaAccessGuard } from './planilla-access.guard';
import { AuthService } from '../services/auth.service';

describe('hasPlanillaAccess', () => {
  it('permite ADMIN', () => {
    expect(hasPlanillaAccess(['ADMIN'])).toBe(true);
  });
  it('permite RRHH_ADMIN', () => {
    expect(hasPlanillaAccess(['RRHH_ADMIN'])).toBe(true);
  });
  it('permite SUPER_ADMIN', () => {
    expect(hasPlanillaAccess(['SUPER_ADMIN'])).toBe(true);
  });
  it('rechaza roles no autorizados', () => {
    expect(hasPlanillaAccess(['SOLICITANTE'])).toBe(false);
    expect(hasPlanillaAccess([])).toBe(false);
  });
});

describe('planillaAccessGuard', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  it('permite RRHH_ADMIN autenticado', () => {
    const auth = TestBed.inject(AuthService);
    vi.spyOn(auth, 'isAuthenticated').mockReturnValue(true);
    vi.spyOn(auth, 'roles').mockReturnValue(['RRHH_ADMIN']);
    const result = TestBed.runInInjectionContext(() =>
      planillaAccessGuard({} as never, { url: '/planilla/periodos' } as never),
    );
    expect(result).toBe(true);
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

  it('redirige a / si autenticado sin rol RRHH', () => {
    const auth = TestBed.inject(AuthService);
    vi.spyOn(auth, 'isAuthenticated').mockReturnValue(true);
    vi.spyOn(auth, 'roles').mockReturnValue(['SOLICITANTE']);
    const result = TestBed.runInInjectionContext(() =>
      planillaAccessGuard({} as never, { url: '/planilla/periodos' } as never),
    );
    expect(result).toBeInstanceOf(UrlTree);
    expect(String(result as UrlTree)).toContain('/');
  });
});
