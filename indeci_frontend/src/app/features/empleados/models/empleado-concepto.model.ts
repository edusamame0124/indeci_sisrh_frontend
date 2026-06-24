/** Mirrors `EmpleadoConceptoDto` (Java). */
export interface EmpleadoConceptoInput {
  empleadoId: number;
  conceptoPlanillaId: number;
  monto: number | null;
  porcentaje: number | null;
  formula: string | null;
  /** Vigencia (Spec 013 / C1) — fechas ISO `YYYY-MM-DD`. */
  fechaInicio?: string | null;
  fechaFin?: string | null;
}

/**
 * Mirrors `ConceptosAsignablesDto` (Java): conceptos ya filtrados por el régimen
 * del empleado (mejora 2026-06-03). Importa el tipo del catálogo para el dropdown.
 */
export interface ConceptosAsignables {
  readonly regimenLaboral: string | null;
  readonly conceptos: readonly import('../../planilla/models/concepto-planilla.model').ConceptoPlanillaRow[];
}

/** Mirrors `EmpleadoConceptoResponseDto` (Java). */
export interface EmpleadoConceptoRow {
  readonly id: number;
  readonly conceptoPlanillaId: number;
  readonly concepto: string;
  readonly monto: number | null;
  readonly porcentaje: number | null;
  readonly formula: string | null;
  readonly activo: number;
  /** Vigencia (Spec 013 / C1) — fechas ISO `YYYY-MM-DD`. */
  readonly fechaInicio?: string | null;
  readonly fechaFin?: string | null;
}
