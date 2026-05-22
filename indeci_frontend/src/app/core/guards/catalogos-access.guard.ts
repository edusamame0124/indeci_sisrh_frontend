import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Roles con acceso de lectura al módulo de catálogos.
 * Spec 009 amplía a RRHH_ADMIN para consulta. Las acciones de escritura
 * (crear/editar/eliminar Bancos, Tipos de cuenta y Conceptos de Planilla)
 * se verifican adicionalmente en cada página contra CATALOGOS_WRITE_ROLES.
 */
export const CATALOGOS_ACCESS_ROLES = ['ADMIN', 'RRHH_ADMIN', 'SUPER_ADMIN'] as const;

/** Roles con permiso de escritura sobre catálogos administrables (Spec 009 — FR-C7). */
export const CATALOGOS_WRITE_ROLES = ['ADMIN', 'SUPER_ADMIN'] as const;

export function hasCatalogosAccess(roles: ReadonlyArray<string>): boolean {
  return CATALOGOS_ACCESS_ROLES.some((r) => roles.includes(r));
}

export function hasCatalogosWrite(roles: ReadonlyArray<string>): boolean {
  return CATALOGOS_WRITE_ROLES.some((r) => roles.includes(r));
}

/**
 * ADMIN / RRHH_ADMIN / SUPER_ADMIN acceden a `/catalogos/**` (Spec 009 amplía
 * acceso de lectura para RRHH_ADMIN; la escritura sigue restringida).
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
