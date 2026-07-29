/**
 * Catálogo central de roles SISRH — matriz RBAC vigente (V012_45).
 *
 * Cada módulo del menú tiene UN rol funcional responsable. `SUPER_ADMIN` es el
 * único rol técnico y conserva bypass total (en backend vía `ROLE_SUPER_ADMIN`).
 *
 *   PLANILLA    → todo el módulo de planilla, asistencia y subsidios.
 *   VINCULACION → Módulo Vinculación + Legajo Personal.
 *   ASISTENCIA  → solo carga de asistencia + CONSULTA de períodos.
 *   RRHH_ADMIN  → Catálogos (lectura+escritura) y Reportes.
 *
 * Retirados en V012_43/44/45: ADMIN, ADMIN_TI, PLANILLA_ANALISTA,
 * PLANILLA_APROBADOR, RRHH_JEFE, RRHH_ANALISTA, RRHH_CONSULTA.
 *
 * Los permisos granulares (`PLA_*`, `ASI_*`, `PER_READ`, `EMP_*`, `CAT_*`,
 * `RPT_*`) viven en el JWT (`permisos[]`) y se aplican con @PreAuthorize en el
 * backend. Este archivo gobierna únicamente la navegación del frontend.
 */

/* ────────────────────────── Roles base ────────────────────────── */

/** Oficina de Informática — único rol técnico, con bypass total. */
export const TI_SUPER_ROLES = ['SUPER_ADMIN'] as const;
export const TI_ALL_ROLES = [...TI_SUPER_ROLES] as const;

/** Rol acotado (V012_16): acceso EXCLUSIVO al módulo Administración. */
export const USER_ADMIN_ROLES = ['GESTOR_USUARIOS'] as const;

/** Roles funcionales de negocio (V012_45) — uno por módulo. */
export const PLANILLA_ROLES = ['PLANILLA'] as const;
export const VINCULACION_ROLES = ['VINCULACION'] as const;
export const ASISTENCIA_ROLES = ['ASISTENCIA'] as const;
export const RRHH_ADMIN_ROLES = ['RRHH_ADMIN'] as const;

/** Portal de papeletas — autoservicio y gestión de solicitudes. */
export const PORTAL_PAPELETAS_ROLES = ['EMPLEADO', 'JEFE', 'RRHH_PAPELETA'] as const;

/** Autoservicio estricto (Mi perfil / Mi legajo): solo el propio empleado. */
export const AUTOSERVICIO_ROLES = ['EMPLEADO'] as const;

/* ──────────────────── Conjuntos por módulo ──────────────────── */

/** Administración — TI + rol acotado GESTOR_USUARIOS. */
export const ADMIN_MODULE_ACCESS_ROLES = [...TI_ALL_ROLES, ...USER_ADMIN_ROLES] as const;

/**
 * Planilla COMPLETO: los 10 ítems del menú, escritura y aprobación.
 * `ASISTENCIA` queda deliberadamente fuera.
 */
export const PLANILLA_FULL_ROLES = [...TI_ALL_ROLES, ...PLANILLA_ROLES] as const;

/**
 * Ítem padre "Planilla" del menú. Incluye `ASISTENCIA` porque ve 2 de los 10
 * hijos (Periodos y Gestión de Asistencia); el resto se recorta por hijo con
 * `PLANILLA_FULL_ROLES`.
 */
export const PLANILLA_MENU_ROLES = [
  ...TI_ALL_ROLES,
  ...PLANILLA_ROLES,
  ...ASISTENCIA_ROLES,
] as const;

/** Módulo Asistencia (carga y corrección de marcaciones). */
export const ASISTENCIA_ACCESS_ROLES = [
  ...TI_ALL_ROLES,
  ...PLANILLA_ROLES,
  ...ASISTENCIA_ROLES,
] as const;

/** Módulo Vinculación + Legajo Personal (legajo de TODOS los empleados). */
export const VINCULACION_ACCESS_ROLES = [...TI_ALL_ROLES, ...VINCULACION_ROLES] as const;

/** Catálogos — lectura. `PLANILLA` entra solo a consultar. */
export const CATALOGOS_ACCESS_ROLES = [
  ...TI_ALL_ROLES,
  ...PLANILLA_ROLES,
  ...RRHH_ADMIN_ROLES,
] as const;

/** Catálogos — escritura (CAT_WRITE). `PLANILLA` NO escribe. */
export const CATALOGOS_WRITE_ROLES = [...TI_ALL_ROLES, ...RRHH_ADMIN_ROLES] as const;

/** Reportes — salidas de planilla; compartido por PLANILLA y RRHH_ADMIN. */
export const REPORTES_ACCESS_ROLES = [
  ...TI_ALL_ROLES,
  ...PLANILLA_ROLES,
  ...RRHH_ADMIN_ROLES,
] as const;

/** PLA_WRITE — crear borradores, editar configuraciones, enviar a revisión. */
export const PLANILLA_WRITE_ROLES = [...PLANILLA_FULL_ROLES] as const;

/** PLA_APPROVE — activar / aprobar / cerrar / reabrir / anular. */
export const PLANILLA_APPROVE_ROLES = [...PLANILLA_FULL_ROLES] as const;

/** Gestiones del personal (papeletas). Sus hijos se filtran por permisos PAP_*. */
export const GESTIONES_PERSONAL_ROLES = [...PORTAL_PAPELETAS_ROLES] as const;

export function hasAnyRole(
  userRoles: ReadonlyArray<string>,
  allowed: ReadonlyArray<string>,
): boolean {
  return allowed.some((r) => userRoles.includes(r));
}
