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

/**
 * Rol SISRH acotado (V012_16): acceso EXCLUSIVO al módulo Administración
 * (Usuarios + Roles/Permisos + Auditoría). Deliberadamente NO es un rol TI:
 * no debe entrar a Catálogos, Empleados, Planilla ni Reportes. Por eso vive
 * solo aquí y se suma únicamente a ADMIN_MODULE_ACCESS_ROLES. */
export const USER_ADMIN_ROLES = ['GESTOR_USUARIOS'] as const;

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

/** Módulo Administración — TI + rol acotado GESTOR_USUARIOS (V012_16).
 *  GESTOR_USUARIOS accede solo a este módulo, a ninguno de los operativos. */
export const ADMIN_MODULE_ACCESS_ROLES = [...TI_ALL_ROLES, ...USER_ADMIN_ROLES] as const;

/** Catálogos: lectura RRHH + TI; escritura solo TI (Fase 2 por permiso CAT_WRITE). */
export const CATALOGOS_ACCESS_ROLES = [...TI_ALL_ROLES, ...RRHH_ALL_OPERATIONAL_ROLES] as const;
export const CATALOGOS_WRITE_ROLES = [...TI_ALL_ROLES] as const;

/** Roles del portal de papeletas (empleado, jefe inmediato, gestión RRHH).
 *  Acceso EXCLUSIVO a /gestiones-personal y autoservicio.
 *  NO deben ver módulos de planilla operativa (MCPP, Suspensiones, Cierre, Semáforo). */
export const PORTAL_PAPELETAS_ROLES = ['EMPLEADO', 'JEFE', 'RRHH_PAPELETA'] as const;

/** Módulos operativos TI + RRHH: Planilla, Empleados, Catálogos.
 *  Excluye deliberadamente PORTAL_PAPELETAS_ROLES (segregación de privilegios). */
export const PLANILLA_OPERATIVA_ROLES = [
  ...TI_ALL_ROLES,
  ...RRHH_JEFE_ROLES,
  ...RRHH_ANALISTA_ROLES,
  ...PLANILLA_ANALISTA_ROLES,
  ...PLANILLA_APROBADOR_ROLES,
  ...RRHH_CONSULTA_ROLES,
  ...RRHH_LEGACY_ROLES,
] as const;

/**
 * Conceptos de Planilla (SPEC_CONCEPTOS_PLANILLA §8/D1) — escritura.
 * Equivale a PLA_WRITE: crea borradores, edita configuraciones, envía a revisión.
 * El dominio pertenece a Planilla; reutiliza los roles operativos de planilla
 * (no `CATALOGOS_WRITE_ROLES`, que era solo TI).
 */
export const PLANILLA_WRITE_ROLES = [...PLANILLA_OPERATIVA_ROLES] as const;

/**
 * Conceptos de Planilla (SPEC_CONCEPTOS_PLANILLA §8/D1) — aprobación.
 * Equivale a PLA_APPROVE: activa / cierra / anula configuraciones sensibles.
 * Solo TI (super/admin), jefe RRHH y aprobador de planilla.
 */
export const PLANILLA_APPROVE_ROLES = [
  ...TI_ALL_ROLES,
  ...RRHH_JEFE_ROLES,
  ...PLANILLA_APROBADOR_ROLES,
] as const;

/** Empleados + Portal papeletas: incluye roles operativos TI/RRHH + portal autoservicio.
 *  Usado por empleadosAccessGuard y gestiones-personal. */
export const EMPLEADOS_ACCESS_ROLES = [
  ...PLANILLA_OPERATIVA_ROLES,
  ...PORTAL_PAPELETAS_ROLES,
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
