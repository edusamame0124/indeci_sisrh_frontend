import { EMPLEADOS_ACCESS_ROLES as _EMPLEADOS_ACCESS_ROLES } from './sisrh-roles.config';

/**
 * Roles con acceso a módulos Empleados y Planilla.
 * Reexporta desde sisrh-roles.config (Fase 1 — TI / RRHH segregados).
 */
export const EMPLEADOS_ACCESS_ROLES = _EMPLEADOS_ACCESS_ROLES;
export type EmpleadosAccessRole = (typeof EMPLEADOS_ACCESS_ROLES)[number];
