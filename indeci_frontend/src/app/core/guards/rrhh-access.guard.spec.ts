import { describe, expect, it, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter, UrlTree } from '@angular/router';
import { hasRrhhAccess, rrhhAccessGuard } from './rrhh-access.guard';
import { AuthService } from '../services/auth.service';

describe('hasRrhhAccess', () => {
  it('allows ADMIN', () => {
    expect(hasRrhhAccess(['ADMIN'])).toBe(true);
  });
  it('allows RRHH_ADMIN', () => {
    expect(hasRrhhAccess(['RRHH_ADMIN', 'AREA'])).toBe(true);
  });
  it('allows SUPER_ADMIN', () => {
    expect(hasRrhhAccess(['SUPER_ADMIN'])).toBe(true);
  });
  it('denies otros', () => {
    expect(hasRrhhAccess(['POSTULANTE'])).toBe(false);
  });
});

describe('rrhhAccessGuard', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  it('permite ADMIN autenticado', () => {
    const auth = TestBed.inject(AuthService);
    vi.spyOn(auth, 'isAuthenticated').mockReturnValue(true);
    vi.spyOn(auth, 'roles').mockReturnValue(['ADMIN']);
    const result = TestBed.runInInjectionContext(() =>
      rrhhAccessGuard({} as never, { url: '/rrhh/personas' } as never),
    );
    expect(result).toBe(true);
  });

  it('redirige a / cuando no tiene rol RRHH', () => {
    const auth = TestBed.inject(AuthService);
    vi.spyOn(auth, 'isAuthenticated').mockReturnValue(true);
    vi.spyOn(auth, 'roles').mockReturnValue(['SOLICITANTE']);

    const result = TestBed.runInInjectionContext(() =>
      rrhhAccessGuard({} as never, { url: '/rrhh/personas' } as never),
    );
    expect(result).toBeInstanceOf(UrlTree);
    expect(String(result as UrlTree)).toContain('/');
  });
});
