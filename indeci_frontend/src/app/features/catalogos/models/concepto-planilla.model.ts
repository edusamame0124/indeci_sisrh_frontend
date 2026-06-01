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

/**
 * Mirrors `ConceptoPlanillaResponseDto` (Java response).
 *
 * F3.2 — campos extendidos del catálogo enriquecido para que la UI muestre
 * chips visuales por afectación, vigencia, MUC/CUC y régimen aplicable.
 * Los campos `S`/`N` se devuelven como strings desde el backend.
 */
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

  // F3.2 — códigos externos
  readonly codigoPlameSunat?: string | null;
  readonly codigoMcpp?: string | null;

  // F3.2 — afectaciones tributarias / previsionales (S / N)
  readonly afectoIr5ta?: string | null;
  readonly afectoAportePens?: string | null;
  readonly afectoEssalud?: string | null;

  // F3.2 — banderas LEY-07 MUC vs CUC
  readonly esMuc?: string | null;
  readonly esCuc?: string | null;

  /**
   * Régimen aplicable. Acepta valor único ("276", "728", "1057", "SERVIR",
   * "TODOS") o CSV ("728,1057") según F1.5b para los DS de pacto colectivo.
   */
  readonly regimenAplicable?: string | null;

  readonly fechaVigIni?: string | null;
  readonly fechaVigFin?: string | null;

  /** S/N — motor v3 prorratea por días laborados si "S". */
  readonly esProrrateable?: string | null;
}
