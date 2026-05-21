/**
 * Resumen por meta presupuestal (SPEC §12.2 PANTALLA-05).
 * Espejo de los DTOs Java `ResumenMeta*Dto`.
 */

/** Línea de empleado dentro de una meta — espejo de `ResumenMetaEmpleadoDto`. */
export interface ResumenMetaEmpleado {
  readonly empleadoId: number;
  readonly ingresos: number;
  readonly essalud: number;
  readonly aportes: number;
  readonly total: number;
}

/** Fila de meta presupuestal — espejo de `ResumenMetaDto`. */
export interface ResumenMetaRow {
  readonly meta: string;
  readonly centroCosto: string;
  /** Población económicamente activa: número de empleados de la meta. */
  readonly pea: number;
  readonly ingresos: number;
  readonly essalud: number;
  readonly aportes: number;
  /** Costo total para la entidad = ingresos + ESSALUD. */
  readonly total: number;
  readonly empleados: readonly ResumenMetaEmpleado[];
}
