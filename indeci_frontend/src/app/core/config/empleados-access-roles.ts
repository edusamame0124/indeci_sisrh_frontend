/**
 * Roles JWT con acceso a módulos Empleados y Planilla (specs/009 y MVP RRHH).
 * Patrón alineado a `ADMIN_MODULE_ACCESS_ROLES` en admin-access.guard.
 */
export const EMPLEADOS_ACCESS_ROLES = ['ADMIN', 'RRHH_ADMIN', 'SUPER_ADMIN'] as const;

export type EmpleadosAccessRole = (typeof EMPLEADOS_ACCESS_ROLES)[number];
