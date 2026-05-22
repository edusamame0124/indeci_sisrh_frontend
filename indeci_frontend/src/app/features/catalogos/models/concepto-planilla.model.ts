/** Tipo de concepto de planilla (campo legacy `TIPO`). */
export type ConceptoPlanillaTipo = 'INGRESO' | 'DESCUENTO';

/** Clasificación MEF del concepto (campo `TIPO_CONCEPTO` — Spec 010/013). */
export type ConceptoPlanillaTipoConcepto =
  | 'REMUNERATIVO'
  | 'NO_REMUNERATIVO'
  | 'DESCUENTO'
  | 'APORTE_TRABAJADOR'
  | 'APORTE_EMPLEADOR';

/** Mirrors `ConceptoPlanillaDto` (Java request). */
export interface ConceptoPlanillaInput {
  codigo: string;
  nombre: string;
  tipo: ConceptoPlanillaTipo;
  naturaleza: string;
}

/** Mirrors `ConceptoPlanillaResponseDto` (Java response). */
export interface ConceptoPlanillaRow {
  readonly id: number;
  readonly codigo: string;
  readonly nombre: string;
  readonly tipo: ConceptoPlanillaTipo;
  readonly naturaleza: string;
  readonly activo: number;
  /** Campos MEF (Spec 013 / C1) — pueden ser null en BD. */
  readonly codigoMef?: string | null;
  readonly codigoSisper?: string | null;
  readonly tipoConcepto?: ConceptoPlanillaTipoConcepto | null;
}
