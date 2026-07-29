import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import {
  ASISTENCIA_ACCESS_ROLES,
  PLANILLA_APPROVE_ROLES,
  PLANILLA_FULL_ROLES,
  PLANILLA_MENU_ROLES,
  PLANILLA_WRITE_ROLES,
  hasAnyRole,
} from '../config/sisrh-roles.config';
import { AuthService } from '../services/auth.service';

export {
  ASISTENCIA_ACCESS_ROLES,
  PLANILLA_APPROVE_ROLES,
  PLANILLA_FULL_ROLES,
  PLANILLA_MENU_ROLES,
  PLANILLA_WRITE_ROLES,
};

/** Acceso al módulo Planilla COMPLETO (los 10 ítems). Excluye ASISTENCIA. */
export function hasPlanillaAccess(roles: ReadonlyArray<string>): boolean {
  return hasAnyRole(roles, PLANILLA_FULL_ROLES);
}

/** Ítem padre del menú Planilla: incluye ASISTENCIA, que solo ve 2 de los 10 hijos. */
export function hasPlanillaMenuAccess(roles: ReadonlyArray<string>): boolean {
  return hasAnyRole(roles, PLANILLA_MENU_ROLES);
}

/** Módulo Asistencia — carga y corrección de marcaciones (permisos ASI_*). */
export function hasAsistenciaAccess(roles: ReadonlyArray<string>): boolean {
  return hasAnyRole(roles, ASISTENCIA_ACCESS_ROLES);
}

/** PLA_WRITE — crear borradores, editar configuraciones, enviar a revisión. */
export function hasPlanillaWrite(roles: ReadonlyArray<string>): boolean {
  return hasAnyRole(roles, PLANILLA_WRITE_ROLES);
}

/** PLA_APPROVE — activar / aprobar / cerrar / reabrir / anular. */
export function hasPlanillaApprove(roles: ReadonlyArray<string>): boolean {
  return hasAnyRole(roles, PLANILLA_APPROVE_ROLES);
}

function redirect(state: { url: string }, allowed: boolean): boolean | UrlTree {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: state.url } });
  }
  return allowed ? true : router.createUrlTree(['/']);
}

/**
 * Módulo Planilla COMPLETO — solo SUPER_ADMIN y PLANILLA.
 * `ASISTENCIA` queda fuera: llega únicamente a `/planilla/periodos`, que declara
 * su propio guard (`planillaPeriodosGuard`) antes de esta ruta.
 */
export const planillaAccessGuard: CanActivateFn = (_route, state): boolean | UrlTree => {
  const auth = inject(AuthService);
  return redirect(state, hasPlanillaAccess(auth.roles()));
};

/**
 * `/planilla/periodos` — PLANILLA opera, ASISTENCIA solo consulta (PER_READ).
 * El backend impide a ASISTENCIA crear o editar períodos (PLA_WRITE).
 */
export const planillaPeriodosGuard: CanActivateFn = (_route, state): boolean | UrlTree => {
  const auth = inject(AuthService);
  return redirect(state, hasPlanillaMenuAccess(auth.roles()));
};

/** Módulo Asistencia — SUPER_ADMIN, PLANILLA y ASISTENCIA. */
export const asistenciaAccessGuard: CanActivateFn = (_route, state): boolean | UrlTree => {
  const auth = inject(AuthService);
  return redirect(state, hasAsistenciaAccess(auth.roles()));
};
