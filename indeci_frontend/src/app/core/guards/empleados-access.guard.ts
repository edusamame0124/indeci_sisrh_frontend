import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { EMPLEADOS_ACCESS_ROLES } from '../config/empleados-access-roles';
import { AuthService } from '../services/auth.service';

export function hasEmpleadosAccess(roles: ReadonlyArray<string>): boolean {
  return EMPLEADOS_ACCESS_ROLES.some((r) => roles.includes(r));
}

/**
 * Solo usuarios autenticados con rol ADMIN, RRHH_ADMIN o SUPER_ADMIN acceden al módulo Empleados.
 * Renombrado en Spec 009 / T145 desde `rrhh-access.guard.ts`.
 */
export const empleadosAccessGuard: CanActivateFn = (_route, state): boolean | UrlTree => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/auth/login'], {
      queryParams: { returnUrl: state.url },
    });
  }
  return hasEmpleadosAccess(auth.roles())
    ? true
    : router.createUrlTree(['/']);
};
