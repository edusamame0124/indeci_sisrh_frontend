import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AUTOSERVICIO_ROLES, hasAnyRole } from '../config/sisrh-roles.config';
import { AuthService } from '../services/auth.service';

export { AUTOSERVICIO_ROLES };

/** Autoservicio estricto: Mi perfil y Mi legajo son del propio empleado. */
export function hasAutoservicioAccess(roles: ReadonlyArray<string>): boolean {
  return hasAnyRole(roles, AUTOSERVICIO_ROLES);
}

/**
 * Guard de autoservicio (V012_45). "Mi perfil" y "Mi legajo" los ve únicamente
 * el rol `EMPLEADO`. Los roles operativos que además sean trabajadores de la
 * entidad ya lo tienen asignado, por lo que no pierden su autoservicio.
 */
export const autoservicioGuard: CanActivateFn = (_route, state): boolean | UrlTree => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: state.url } });
  }
  return hasAutoservicioAccess(auth.roles()) ? true : router.createUrlTree(['/']);
};
