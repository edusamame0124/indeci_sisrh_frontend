import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * SUPER_ADMIN tiene prioridad; si el JWT institucional aún no lo emite se permite ADMIN
 * (rol administrativo disponible ver clarify Spec 007).
 */
export const ADMIN_MODULE_ACCESS_ROLES = ['SUPER_ADMIN', 'ADMIN'] as const;

export function hasAdminModuleAccess(roles: ReadonlyArray<string>): boolean {
  const rSet = new Set(roles);
  if (rSet.has('SUPER_ADMIN')) return true;
  return rSet.has('ADMIN');
}

export const adminAccessGuard: CanActivateFn = (_route, state): boolean | UrlTree => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/auth/login'], {
      queryParams: { returnUrl: state.url },
    });
  }

  return hasAdminModuleAccess(auth.roles()) ? true : router.createUrlTree(['/']);
};
