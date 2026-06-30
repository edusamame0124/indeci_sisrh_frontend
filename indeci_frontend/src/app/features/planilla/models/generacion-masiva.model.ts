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
  /** IDs de los empleados generados exitosamente. */
  readonly exitososIds?: ReadonlyArray<number>;
}

/** Payload para la generación masiva de planilla. */
export interface GenerarPlanillaCabeceraPayload {
  readonly periodo: string;
  readonly regimenLaboralId: number;
  readonly tipoContratoId?: number | null;
  readonly condicionLaboralId?: number | null;
  readonly modalidadCasId?: number | null;
  readonly concepto: string;
  readonly tipoPlanilla: string;
  readonly ordenBoleta?: string | null;
  readonly loteId?: number | null;
}
