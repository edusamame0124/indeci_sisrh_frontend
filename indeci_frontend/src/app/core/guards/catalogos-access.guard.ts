import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import {
  CATALOGOS_ACCESS_ROLES,
  CATALOGOS_WRITE_ROLES,
  hasAnyRole,
} from '../config/sisrh-roles.config';
import { AuthService } from '../services/auth.service';

export { CATALOGOS_ACCESS_ROLES, CATALOGOS_WRITE_ROLES };

export function hasCatalogosAccess(roles: ReadonlyArray<string>): boolean {
  return hasAnyRole(roles, CATALOGOS_ACCESS_ROLES);
}

export function hasCatalogosWrite(roles: ReadonlyArray<string>): boolean {
  return hasAnyRole(roles, CATALOGOS_WRITE_ROLES);
}

export const catalogosAccessGuard: CanActivateFn = (_route, state): boolean | UrlTree => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/auth/login'], {
      queryParams: { returnUrl: state.url },
    });
  }
  return hasCatalogosAccess(auth.roles())
    ? true
    : router.createUrlTree(['/']);
};
