/**
 * FASE 1 — Constancia de suspensión de retención de 4ta categoría (CAS).
 * Dato tributario (SUNAT), separado de AFP/ONP.
 */
export interface Suspension4taRow {
  readonly id: number;
  readonly empleadoId: number;
  readonly nroConstancia: string | null;
  readonly fechaEmision: string | null;
  readonly fechaVigIni: string | null;
  readonly fechaVigFin: string | null;
  readonly estado: string;
  readonly observacion: string | null;
  readonly legajoDocumentoId: number | null;
  /** Badge calculado por el backend: VIGENTE | VENCIDA | FUTURA | INACTIVA. */
  readonly estadoVigencia: string;
}

/** Alta/edición de una constancia. */
export interface Suspension4taInput {
  readonly empleadoId: number;
  readonly nroConstancia: string | null;
  readonly fechaEmision: string | null;
  readonly fechaVigIni: string | null;
  readonly fechaVigFin: string | null;
  readonly observacion: string | null;
  readonly legajoDocumentoId?: number | null;
}
