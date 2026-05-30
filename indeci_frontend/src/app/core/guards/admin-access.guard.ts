import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { ADMIN_MODULE_ACCESS_ROLES, hasAnyRole } from '../config/sisrh-roles.config';
import { AuthService } from '../services/auth.service';

/** Reexport para main-navigation y tests. */
export { ADMIN_MODULE_ACCESS_ROLES };

export function hasAdminModuleAccess(roles: ReadonlyArray<string>): boolean {
  return hasAnyRole(roles, ADMIN_MODULE_ACCESS_ROLES);
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
