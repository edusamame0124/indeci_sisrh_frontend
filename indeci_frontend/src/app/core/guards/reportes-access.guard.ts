import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { REPORTES_ACCESS_ROLES, hasAnyRole } from '../config/sisrh-roles.config';
import { AuthService } from '../services/auth.service';

export { REPORTES_ACCESS_ROLES };
export type ReportesAccessRole = (typeof REPORTES_ACCESS_ROLES)[number];

export function hasReportesAccess(roles: ReadonlyArray<string>): boolean {
  return hasAnyRole(roles, REPORTES_ACCESS_ROLES);
}

export const reportesAccessGuard: CanActivateFn = (_route, state): boolean | UrlTree => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/auth/login'], {
      queryParams: { returnUrl: state.url },
    });
  }
  return hasReportesAccess(auth.roles())
    ? true
    : router.createUrlTree(['/']);
};
