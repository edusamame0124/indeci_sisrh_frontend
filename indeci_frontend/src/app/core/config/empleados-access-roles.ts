import { GESTIONES_PERSONAL_ROLES } from './sisrh-roles.config';

/**
 * @deprecated RBAC V012_45 disolvió el conjunto único "empleados": Vinculación y
 * Legajo pasaron a `VINCULACION_ACCESS_ROLES`, y el autoservicio a
 * `AUTOSERVICIO_ROLES`. Este alias conserva únicamente el sentido restante
 * (Gestiones del personal / papeletas). Importar directamente desde
 * `sisrh-roles.config` en código nuevo.
 */
export const EMPLEADOS_ACCESS_ROLES = GESTIONES_PERSONAL_ROLES;
export type EmpleadosAccessRole = (typeof EMPLEADOS_ACCESS_ROLES)[number];
