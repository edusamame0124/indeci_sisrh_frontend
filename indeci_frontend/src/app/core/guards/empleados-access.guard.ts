import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { GESTIONES_PERSONAL_ROLES, hasAnyRole } from '../config/sisrh-roles.config';
import { AuthService } from '../services/auth.service';

export { GESTIONES_PERSONAL_ROLES };

/** Gestiones del personal (papeletas) — roles del portal. */
export function hasGestionesPersonalAccess(roles: ReadonlyArray<string>): boolean {
  return hasAnyRole(roles, GESTIONES_PERSONAL_ROLES);
}

/**
 * Guard de Gestiones del personal (V012_45). El módulo es autoservicio de
 * papeletas: lo ven `EMPLEADO`, `JEFE` y `RRHH_PAPELETA`. Sus sub-ítems se
 * recortan además por permisos `PAP_JEFE` / `PAP_RRHH`.
 *
 * Antes se llamaba `empleadosAccessGuard` y cubría también los módulos
 * operativos; esos pasaron a `vinculacionAccessGuard` y `planillaAccessGuard`.
 */
export const gestionesPersonalGuard: CanActivateFn = (_route, state): boolean | UrlTree => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: state.url } });
  }
  return hasGestionesPersonalAccess(auth.roles()) ? true : router.createUrlTree(['/']);
};
