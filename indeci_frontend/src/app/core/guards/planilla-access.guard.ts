import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { PLANILLA_OPERATIVA_ROLES } from '../config/sisrh-roles.config';
import { AuthService } from '../services/auth.service';

export { PLANILLA_OPERATIVA_ROLES };

export function hasPlanillaAccess(roles: ReadonlyArray<string>): boolean {
  return PLANILLA_OPERATIVA_ROLES.some((r) => roles.includes(r));
}

/**
 * Guard Módulo Planilla — perfiles operativos TI y RRHH únicamente.
 * PORTAL_PAPELETAS_ROLES (EMPLEADO, JEFE, RRHH_PAPELETA) están excluidos
 * por segregación de privilegios: no deben acceder a MCPP, Suspensiones,
 * Cierre ni Semáforo Presupuestal.
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
