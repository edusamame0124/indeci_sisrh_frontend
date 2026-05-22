import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Protege rutas que requieren un token temporal vivo (`/auth/otp`, `/auth/otp/enroll`).
 * Si el usuario llega sin haber pasado por login, lo redirige a /auth/login.
 */
export const temporalTokenGuard: CanActivateFn = (): boolean | UrlTree => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // Debe tener un access token (que será el temporal) NO expirado y con otpValidado=false
  if (auth.requiresOtpValidation() && !auth.isExpired()) {
    return true;
  }

  return router.createUrlTree(['/auth/login']);
};
