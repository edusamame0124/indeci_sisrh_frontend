import { describe, expect, it, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { authGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';

describe('authGuard', () => {
  let auth: AuthService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    auth = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
  });

  it('returns true when authenticated', () => {
    vi.spyOn(auth, 'isAuthenticated').mockReturnValue(true);
    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as never, { url: '/dashboard' } as never),
    );
    expect(result).toBe(true);
  });

  it('returns UrlTree to /auth/login when not authenticated, with returnUrl', () => {
    vi.spyOn(auth, 'isAuthenticated').mockReturnValue(false);
    const tree = router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: '/dashboard' } });
    vi.spyOn(router, 'createUrlTree').mockReturnValue(tree);

    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as never, { url: '/dashboard' } as never),
    );

    expect(result).toBeInstanceOf(UrlTree);
    expect(router.createUrlTree).toHaveBeenCalledWith(['/auth/login'], {
      queryParams: { returnUrl: '/dashboard' },
    });
  });
});
