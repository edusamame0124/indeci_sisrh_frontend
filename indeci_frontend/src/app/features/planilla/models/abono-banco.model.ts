/**
 * Abonos bancarios M14 (SPEC §12.2 PANTALLA-07).
 * Espejo de los DTOs Java `AbonoBancoResponseDto` / `ResumenBancoDto`.
 */

/** Fila de abono — espejo de `AbonoBancoResponseDto`. */
export interface AbonoBancoRow {
  readonly id: number;
  readonly movimientoPlanillaId: number;
  readonly empleadoId: number;
  readonly banco: string;
  readonly nroCuenta: string | null;
  readonly cci: string | null;
  readonly meta: string | null;
  readonly montoNeto: number;
  /** PENDIENTE | PROCESADO | RECHAZADO. */
  readonly estado: string;
  readonly nroTicketMcpp: string | null;
  readonly fechaProcesado: string | null;
}

/** Grupo de abonos por banco — espejo de `ResumenBancoDto`. */
export interface ResumenBancoRow {
  readonly banco: string;
  readonly cantidad: number;
  readonly totalNeto: number;
  readonly abonos: readonly AbonoBancoRow[];
}
