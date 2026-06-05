/** Mirrors `MovimientoPlanillaResponseDto` (Java). */
export interface MovimientoPlanillaRow {
  readonly id: number;
  readonly empleadoId: number;
  readonly empleadoNombre?: string | null;
  readonly empleadoDni?: string | null;
  readonly regimenLaboralCodigo?: string | null;
  readonly regimenLaboralNombre?: string | null;
  readonly periodo: string;
  readonly totalIngresos: number;
  readonly totalDescuentos: number;
  readonly netoPagar: number;
  /** PENDIENTE / PROCESADO / OBSERVADO / ANULADO (según backend). */
  readonly estado: string;
  readonly observacion: string | null;
  readonly activo: number;
  /** Spec 010 §5.4 / SERVIR-07 — umbral mínimo del neto. */
  readonly neto50pctMinimo: number | null;
  /** 'BIEN' | 'NETO_NO_VA' — semáforo de validación neto 50%. */
  readonly estadoNeto: string | null;
}
