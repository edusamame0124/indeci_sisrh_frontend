import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** Roles con acceso al módulo de catálogos administrativos (más estricto que RRHH). */
export const CATALOGOS_ACCESS_ROLES = ['ADMIN', 'SUPER_ADMIN'] as const;

export function hasCatalogosAccess(roles: ReadonlyArray<string>): boolean {
  return CATALOGOS_ACCESS_ROLES.some((r) => roles.includes(r));
}

/**
 * ADMIN / SUPER_ADMIN acceden a `/catalogos/**` (US5 Spec 006 + coherencia Spec 007).
 */
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
