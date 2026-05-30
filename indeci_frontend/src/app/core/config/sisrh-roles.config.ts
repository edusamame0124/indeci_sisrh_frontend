/**
 * Catálogo central de roles SISRH — Fase 1 (TI vs RRHH segregados).
 * Fuente de verdad para guards de navegación. Los permisos granulares (PLA_*)
 * viven en JWT `permisos[]` y se endurecen en Fase 2 (@PreAuthorize backend).
 */

/** Oficina de Informática — acceso técnico (no operación RRHH formal). */
export const TI_SUPER_ROLES = ['SUPER_ADMIN'] as const;
export const TI_ADMIN_ROLES = ['ADMIN_TI', 'ADMIN'] as const;
/** ADMIN: legacy en BD; ADMIN_TI: rol institucional TI Fase 1. */
export const TI_ALL_ROLES = [...TI_SUPER_ROLES, ...TI_ADMIN_ROLES] as const;

/** RRHH — procesos de negocio (nunca roles TI). */
export const RRHH_JEFE_ROLES = ['RRHH_JEFE'] as const;
export const RRHH_ANALISTA_ROLES = ['RRHH_ANALISTA'] as const;
export const PLANILLA_ANALISTA_ROLES = ['PLANILLA_ANALISTA'] as const;
export const PLANILLA_APROBADOR_ROLES = ['PLANILLA_APROBADOR'] as const;
export const RRHH_CONSULTA_ROLES = ['RRHH_CONSULTA'] as const;
/** Compatibilidad temporal con instalaciones previas. */
export const RRHH_LEGACY_ROLES = ['RRHH_ADMIN'] as const;

export const RRHH_ALL_OPERATIONAL_ROLES = [
  ...RRHH_JEFE_ROLES,
  ...RRHH_ANALISTA_ROLES,
  ...PLANILLA_ANALISTA_ROLES,
  ...PLANILLA_APROBADOR_ROLES,
  ...RRHH_CONSULTA_ROLES,
  ...RRHH_LEGACY_ROLES,
] as const;

/** Módulo Administración — solo TI. */
export const ADMIN_MODULE_ACCESS_ROLES = [...TI_ALL_ROLES] as const;

/** Catálogos: lectura RRHH + TI; escritura solo TI (Fase 2 por permiso CAT_WRITE). */
export const CATALOGOS_ACCESS_ROLES = [...TI_ALL_ROLES, ...RRHH_ALL_OPERATIONAL_ROLES] as const;
export const CATALOGOS_WRITE_ROLES = [...TI_ALL_ROLES] as const;

/** Empleados + Planilla + Portal empleado. */
export const EMPLEADOS_ACCESS_ROLES = [
  ...TI_ALL_ROLES,
  ...RRHH_JEFE_ROLES,
  ...RRHH_ANALISTA_ROLES,
  ...PLANILLA_ANALISTA_ROLES,
  ...PLANILLA_APROBADOR_ROLES,
  ...RRHH_CONSULTA_ROLES,
  ...RRHH_LEGACY_ROLES,
] as const;

/** Reportes: TI + jefe RRHH + consulta + analistas planilla (archivo bancos / AIRHSP). */
export const REPORTES_ACCESS_ROLES = [
  ...TI_ALL_ROLES,
  ...RRHH_JEFE_ROLES,
  ...RRHH_CONSULTA_ROLES,
  ...PLANILLA_ANALISTA_ROLES,
  ...PLANILLA_APROBADOR_ROLES,
] as const;

export function hasAnyRole(
  userRoles: ReadonlyArray<string>,
  allowed: ReadonlyArray<string>,
): boolean {
  return allowed.some((r) => userRoles.includes(r));
}
