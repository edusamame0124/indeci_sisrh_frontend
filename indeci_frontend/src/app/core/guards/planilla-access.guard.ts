import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { EMPLEADOS_ACCESS_ROLES } from '../config/empleados-access-roles';
import { AuthService } from '../services/auth.service';

export function hasPlanillaAccess(roles: ReadonlyArray<string>): boolean {
  return EMPLEADOS_ACCESS_ROLES.some((r) => roles.includes(r));
}

/**
 * Guard del Módulo 3 — Planilla (Spec 009 / T159).
 * Mismo set de roles que Empleados (ADMIN, RRHH_ADMIN, SUPER_ADMIN) — no se duplica la constante.
 */
export const planillaAccessGuard: CanActivateFn = (_route, state): boolean | UrlTree => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/auth/login'], {
      queryParams: { returnUrl: state.url },
    });
  }
  return hasPlanillaAccess(auth.roles())
    ? true
    : router.createUrlTree(['/']);
};
