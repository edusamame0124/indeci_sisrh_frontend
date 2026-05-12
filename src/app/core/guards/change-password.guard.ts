import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Protege la ruta /auth/cambiar-clave. Solo accesible si el usuario tiene
 * un token de cambio-clave vigente (claim newPassOk=false).
 */
export const changePasswordGuard: CanActivateFn = (): boolean | UrlTree => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.requiresPasswordChange() && !auth.isExpired()) {
    return true;
  }

  return router.createUrlTree(['/auth/login']);
};
