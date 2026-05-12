import { describe, expect, it, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { changePasswordGuard } from './change-password.guard';
import { AuthService } from '../services/auth.service';

describe('changePasswordGuard', () => {
  let auth: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    auth = TestBed.inject(AuthService);
    TestBed.inject(Router);
  });

  it('allows when change-password token is alive', () => {
    vi.spyOn(auth, 'requiresPasswordChange').mockReturnValue(true);
    vi.spyOn(auth, 'isExpired').mockReturnValue(false);
    const result = TestBed.runInInjectionContext(() =>
      changePasswordGuard({} as never, { url: '/auth/cambiar-clave' } as never),
    );
    expect(result).toBe(true);
  });

  it('redirects to /auth/login when no change-password token', () => {
    vi.spyOn(auth, 'requiresPasswordChange').mockReturnValue(false);
    vi.spyOn(auth, 'isExpired').mockReturnValue(true);
    const result = TestBed.runInInjectionContext(() =>
      changePasswordGuard({} as never, { url: '/auth/cambiar-clave' } as never),
    );
    expect(result).toBeInstanceOf(UrlTree);
  });
});
