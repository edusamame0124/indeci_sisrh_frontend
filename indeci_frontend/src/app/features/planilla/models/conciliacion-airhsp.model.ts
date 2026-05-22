/**
 * Conciliación AIRHSP M13 (SPEC §12.2 PANTALLA-06).
 * Espejo de los DTOs Java `ConciliacionAirhsp*Dto`.
 */

/** Fila de conciliación — espejo de `ConciliacionAirhspResponseDto`. */
export interface ConciliacionAirhspRow {
  readonly id: number;
  readonly empleadoId: number;
  /** Código del registro del empleado en AIRHSP. */
  readonly registroAirhsp: string | null;
  readonly movimientoPlanillaId: number;
  readonly periodoPlanillaId: number;
  /** Monto calculado por el sistema (remuneración bruta). */
  readonly montoSistema: number;
  /** Monto registrado en AIRHSP (MEF). */
  readonly montoAirhsp: number;
  /** montoSistema − montoAirhsp (columna virtual del backend). */
  readonly diferencia: number | null;
  /** PENDIENTE | CONCILIADO | JUSTIFICADO | RECHAZADO. */
  readonly estado: string;
  readonly justificacion: string | null;
  readonly usuarioRevisa: number | null;
  readonly fechaRevision: string | null;
}

/** Cuerpo PUT de revisión — espejo de `ConciliacionRevisionDto`. */
export interface ConciliacionRevisionInput {
  /** CONCILIADO | JUSTIFICADO | RECHAZADO. */
  readonly estado: string;
  readonly justificacion: string | null;
  readonly usuarioRevisa?: number | null;
}
