import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guard de ruta por PERMISO (segregación fina dentro de un módulo).
 *
 * <p>Exige que el usuario tenga TODOS los permisos indicados (claim JWT `permisos`).
 * Es la fuente de verdad de navegación para sub-módulos restringidos (p. ej. la
 * gestión del jefe inmediato o de RR.HH.): complementa la ocultación en el menú,
 * que es solo cosmética. Si el usuario no cumple, se redirige a la raíz.
 */
export function requirePermisos(...permisos: readonly string[]): CanActivateFn {
  return (_route, state): boolean | UrlTree => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (!auth.isAuthenticated()) {
      return router.createUrlTree(['/auth/login'], {
        queryParams: { returnUrl: state.url },
      });
    }

    const owned = new Set(auth.permisos());
    return permisos.every((p) => owned.has(p)) ? true : router.createUrlTree(['/']);
  };
}
