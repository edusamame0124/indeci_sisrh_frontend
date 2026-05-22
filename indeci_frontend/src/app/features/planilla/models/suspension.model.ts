/**
 * B3 / M09 — Suspensiones/licencias y catálogo SUNAT (fuente del .snl/.jor).
 * Espejo de las entidades Java `Suspension` / `CatSuspensionSunat` (V010_30).
 */

/** Catálogo Tabla 21 SUNAT — espejo de `CatSuspensionSunat`. */
export interface CatSuspensionRow {
  readonly codSuspension: string;
  readonly descripcion: string;
  /** SUBSIDIADO | NO_LABORADO_NO_SUB | ESPECIAL. */
  readonly tipoPlame: string;
  /** S | N. */
  readonly requiereCmp: string;
  /** S | N. */
  readonly requiereResolucion: string;
  /** S | N — N no se declara en el .snl (solo .jor), ej: cód 21 Lactancia. */
  readonly vaEnSnl: string;
  readonly codDescuentoPlame: string | null;
  readonly sustentoLegal: string | null;
}

/** Evento de suspensión — espejo de `Suspension`. */
export interface SuspensionRow {
  readonly id: number;
  readonly empleadoId: number;
  readonly codSuspension: string;
  /** ISO date "YYYY-MM-DD". */
  readonly fechaInicio: string;
  readonly fechaFin: string;
  readonly diasAfectos: number;
  readonly nroCmp: string | null;
  readonly nroResolucion: string | null;
  readonly observacion: string | null;
  /** ACTIVO | ANULADO. */
  readonly estado: string;
}

/** Alta/edición de suspensión — espejo del futuro `SuspensionDto`. */
export interface SuspensionInput {
  readonly empleadoId: number;
  readonly codSuspension: string;
  readonly fechaInicio: string;
  readonly fechaFin: string;
  readonly diasAfectos: number;
  readonly nroCmp?: string | null;
  readonly nroResolucion?: string | null;
  readonly observacion?: string | null;
}
