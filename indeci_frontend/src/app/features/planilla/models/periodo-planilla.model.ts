/** Mirrors `PeriodoPlanillaDto` (Java). */
export interface PeriodoPlanillaInput {
  periodo: string;
  fechaInicio: string;
  fechaFin: string;
  observacion: string;
}

/** Estados del ciclo de vida del período (Spec 011 — B7). */
export type PeriodoEstado = 'ABIERTO' | 'EN_REVISION' | 'APROBADO' | 'CERRADO';

/** Mirrors `PeriodoPlanillaResponseDto` (Java). */
export interface PeriodoPlanillaRow {
  readonly id: number;
  readonly periodo: string;
  readonly fechaInicio: string;
  readonly fechaFin: string;
  readonly estado: PeriodoEstado;
  readonly observacion: string;
  readonly fechaCierre: string | null;
  /** Spec 011 — certificación presupuestal y fecha de aprobación. */
  readonly nroCertPresup?: string | null;
  readonly fechaAprobacion?: string | null;
  readonly activo: number;
}

/** Cuerpo PUT para aprobar un período — espejo de `AprobacionPeriodoDto`. */
export interface AprobacionPeriodoInput {
  nroCertPresup: string;
}
