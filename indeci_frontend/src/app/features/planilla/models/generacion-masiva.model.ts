/**
 * Resultado de la generación masiva de planilla (Spec 011 / C2 — BKD-001).
 * Espejo de los DTOs Java `GeneracionMasivaResultDto` / `GeneracionFallidaDto`.
 */

/** Empleado cuya generación falló, con el motivo. */
export interface GeneracionMasivaFallido {
  readonly empleadoId: number;
  readonly razon: string;
}

/** Respuesta de POST `/generador-planilla/masivo/{periodo}`. */
export interface GeneracionMasivaResultado {
  /** Empleados con configuración de planilla considerados. */
  readonly total: number;
  /** Empleados cuya planilla se generó correctamente. */
  readonly exitosos: number;
  /** Empleados que fallaron, con el motivo. */
  readonly fallidos: ReadonlyArray<GeneracionMasivaFallido>;
}
