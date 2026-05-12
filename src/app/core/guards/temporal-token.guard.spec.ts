import { describe, expect, it, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { UrlTree } from '@angular/router';
import { temporalTokenGuard } from './temporal-token.guard';
import { AuthService } from '../services/auth.service';

describe('temporalTokenGuard', () => {
  let auth: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    auth = TestBed.inject(AuthService);
  });

  it('allows when temporal token is alive (otpValidado=false, not expired)', () => {
    vi.spyOn(auth, 'requiresOtpValidation').mockReturnValue(true);
    vi.spyOn(auth, 'isExpired').mockReturnValue(false);
    const result = TestBed.runInInjectionContext(() =>
      temporalTokenGuard({} as never, { url: '/auth/otp' } as never),
    );
    expect(result).toBe(true);
  });

  it('redirects to /auth/login when no temporal token', () => {
    vi.spyOn(auth, 'requiresOtpValidation').mockReturnValue(false);
    vi.spyOn(auth, 'isExpired').mockReturnValue(true);
    const result = TestBed.runInInjectionContext(() =>
      temporalTokenGuard({} as never, { url: '/auth/otp' } as never),
    );
    expect(result).toBeInstanceOf(UrlTree);
  });
});
