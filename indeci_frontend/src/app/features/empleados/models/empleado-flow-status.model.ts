/**
 * Spec 012 / C3 (BKD-006) — Estado agregado del flujo de configuración de un
 * empleado. Espejo del DTO Java `EmpleadoFlowStatusDto`.
 *
 * Cada bandera indica si el paso del flujo RRHH ya tiene registros en backend.
 * El paso 0 («datos personales») no viaja aquí: lo resuelve el frontend desde
 * la ficha de persona (`EmpleadoFlowService.hydrateFromPersona`).
 */
export interface EmpleadoFlowStatus {
  readonly empleadoId: number;
  readonly puesto: boolean;
  readonly banco: boolean;
  readonly pension: boolean;
  readonly planilla: boolean;
  readonly conceptos: boolean;
}
