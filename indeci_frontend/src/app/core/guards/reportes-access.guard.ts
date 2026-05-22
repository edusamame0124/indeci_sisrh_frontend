import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** Roles que pueden acceder al módulo Reportes (Spec 009 / T160 / T163 / FR-R*). */
export const REPORTES_ACCESS_ROLES = ['ADMIN', 'SUPER_ADMIN'] as const;
export type ReportesAccessRole = (typeof REPORTES_ACCESS_ROLES)[number];

export function hasReportesAccess(roles: ReadonlyArray<string>): boolean {
  return REPORTES_ACCESS_ROLES.some((r) => roles.includes(r));
}

/**
 * Guard del Módulo 4 — Reportes.
 * RRHH_ADMIN NO accede; solo ADMIN y SUPER_ADMIN (decisión clarify Spec 009).
 */
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
