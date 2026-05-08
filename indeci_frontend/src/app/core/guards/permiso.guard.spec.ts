import { describe, expect, it, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter, UrlTree } from '@angular/router';
import { permisoGuard } from './permiso.guard';
import { AuthService } from '../services/auth.service';

describe('permisoGuard', () => {
  let auth: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([])],
    });
    auth = TestBed.inject(AuthService);
  });

  it('allows when all permissions held', () => {
    vi.spyOn(auth, 'permisos').mockReturnValue(['p.a', 'p.b']);

    const result = TestBed.runInInjectionContext(() =>
      permisoGuard(['p.a'])({} as never, {} as never),
    );
    expect(result).toBe(true);
  });

  it('redirects via UrlTree when permission missing', () => {
    vi.spyOn(auth, 'permisos').mockReturnValue([]);

    const result = TestBed.runInInjectionContext(() =>
      permisoGuard(['p.a'])({} as never, {} as never),
    );
    expect(result).toBeInstanceOf(UrlTree);
  });

  it('allows when required list empty', () => {
    vi.spyOn(auth, 'permisos').mockReturnValue([]);

    const result = TestBed.runInInjectionContext(() =>
      permisoGuard([])({} as never, {} as never),
    );
    expect(result).toBe(true);
  });
});
