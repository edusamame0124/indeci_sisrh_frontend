import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { VINCULACION_ACCESS_ROLES, hasAnyRole } from '../config/sisrh-roles.config';
import { AuthService } from '../services/auth.service';

export { VINCULACION_ACCESS_ROLES };

/** Módulo Vinculación + Legajo Personal — permisos EMP_READ / EMP_WRITE. */
export function hasVinculacionAccess(roles: ReadonlyArray<string>): boolean {
  return hasAnyRole(roles, VINCULACION_ACCESS_ROLES);
}

/**
 * Guard de Vinculación y Legajo Personal (V012_45). Único rol funcional:
 * `VINCULACION`. Los roles del portal (EMPLEADO/JEFE/RRHH_PAPELETA) quedan
 * excluidos: acceden a sus propios datos por `/legajo/mi-legajo` y
 * `/portal-empleado/mi-perfil`, no al legajo de terceros.
 */
export const vinculacionAccessGuard: CanActivateFn = (_route, state): boolean | UrlTree => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: state.url } });
  }
  return hasVinculacionAccess(auth.roles()) ? true : router.createUrlTree(['/']);
};
