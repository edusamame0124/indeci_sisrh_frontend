import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** Roles JWT con acceso RRHH personas (MVP; ver specs/003-frontend-rrhh-personas/data-model.md). */
export const RRHH_ACCESS_ROLES_READONLY = ['ADMIN', 'RRHH_ADMIN', 'SUPER_ADMIN'] as const;

export function hasRrhhAccess(roles: ReadonlyArray<string>): boolean {
  return RRHH_ACCESS_ROLES_READONLY.some((r) => roles.includes(r));
}

/**
 * Solo usuarios autenticados con rol ADMIN u RRHH_ADMIN acceden al módulo RRHH hasta permisos finos JWT.
 */
export const rrhhAccessGuard: CanActivateFn = (_route, state): boolean | UrlTree => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/auth/login'], {
      queryParams: { returnUrl: state.url },
    });
  }
  return hasRrhhAccess(auth.roles())
    ? true
    : router.createUrlTree(['/']);
};
