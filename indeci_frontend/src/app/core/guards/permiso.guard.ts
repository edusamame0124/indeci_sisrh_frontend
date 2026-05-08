import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Requiere que el usuario posea todas las permisiones listadas (conjunción AND).
 */
export function permisoGuard(requiredPermissions: readonly string[]): CanActivateFn {
  return (): boolean | UrlTree => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (!requiredPermissions.length) return true;

    const held = new Set(auth.permisos());
    const ok = requiredPermissions.every((p) => held.has(p));
    return ok ? true : router.createUrlTree(['/']);
  };
}
